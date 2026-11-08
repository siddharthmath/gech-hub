import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as regenerateOtp } from "@/app/api/v1/admin/users/[email_id]/regenerate-otp/route";
import { DELETE as deleteUser } from "@/app/api/v1/admin/users/[email_id]/route";
import { requireAuth } from "@/src/server/core/auth";
import * as userRepository from "@/src/server/modules/users/repository";
import { authHeader, makeAdmin, makeUser } from "@/tests/helpers";

const domain = process.env.TEAM_EMAIL_DOMAIN ?? "example.edu";
const targetEmail = `remove-target@${domain}`;

async function callUserRoute(
  handler: typeof deleteUser | typeof regenerateOtp,
  emailId: string,
  options: { method: string; headers?: HeadersInit } = { method: "DELETE" },
) {
  const response = await handler(
    new Request(`http://localhost/api/v1/admin/users/${encodeURIComponent(emailId)}`, { method: options.method, headers: options.headers }),
    { params: Promise.resolve({ email_id: emailId }) },
  );
  return { status: response.status, json: await response.json() as unknown };
}

afterEach(() => vi.restoreAllMocks());

describe("admin user delete and OTP regeneration", () => {
  it("deletes a managed user and invalidates their existing token", async () => {
    const admin = await makeAdmin();
    const user = await makeUser({ emailId: targetEmail, teamId: admin.teamId });
    const oldToken = (await authHeader(user)).authorization;
    const result = await callUserRoute(deleteUser, targetEmail.toUpperCase(), { method: "DELETE", headers: await authHeader(admin) });

    expect(result).toMatchObject({ status: 200, json: { deleted: true, email_id: targetEmail } });
    const { prisma } = await import("@/src/lib/prisma");
    expect(await prisma.user.findUnique({ where: { emailId: targetEmail } })).toBeNull();
    await expect(requireAuth(new Request("http://localhost", { headers: { authorization: oldToken } }))).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
  });

  it.each(["unknown user", "admin account"])("returns 404 for %s", async (kind) => {
    const admin = await makeAdmin();
    const emailId = kind === "admin account" ? admin.emailId : `missing@${domain}`;
    const result = await callUserRoute(deleteUser, emailId, { method: "DELETE", headers: await authHeader(admin) });
    expect(result).toMatchObject({ status: 404, json: { error: { code: "NOT_FOUND" } } });
  });

  it("maps a foreign key refusal to USER_HAS_RECORDS", async () => {
    const admin = await makeAdmin();
    await makeUser({ emailId: targetEmail, teamId: admin.teamId });
    vi.spyOn(userRepository, "deleteManagedUser").mockRejectedValue({ code: "P2003" });
    const result = await callUserRoute(deleteUser, targetEmail, { method: "DELETE", headers: await authHeader(admin) });
    expect(result).toMatchObject({ status: 409, json: { error: { code: "USER_HAS_RECORDS" } } });
  });

  it("requires an admin token for deletion and regeneration", async () => {
    const admin = await makeAdmin();
    const student = await makeUser({ teamId: admin.teamId });
    const forbiddenDelete = await callUserRoute(deleteUser, targetEmail, { method: "DELETE", headers: await authHeader(student) });
    const unauthorizedDelete = await callUserRoute(deleteUser, targetEmail);
    const forbiddenOtp = await callUserRoute(regenerateOtp, targetEmail, { method: "POST", headers: await authHeader(student) });
    const unauthorizedOtp = await callUserRoute(regenerateOtp, targetEmail, { method: "POST" });
    expect(forbiddenDelete).toMatchObject({ status: 403, json: { error: { code: "FORBIDDEN" } } });
    expect(unauthorizedDelete).toMatchObject({ status: 401, json: { error: { code: "UNAUTHORIZED" } } });
    expect(forbiddenOtp).toMatchObject({ status: 403, json: { error: { code: "FORBIDDEN" } } });
    expect(unauthorizedOtp).toMatchObject({ status: 401, json: { error: { code: "UNAUTHORIZED" } } });
  });

  it("regenerates and persists a six digit OTP", async () => {
    const admin = await makeAdmin();
    await makeUser({ emailId: targetEmail, teamId: admin.teamId, otp: "654321" });
    const result = await callUserRoute(regenerateOtp, targetEmail, { method: "POST", headers: await authHeader(admin) });
    const otp = (result.json as { otp: string }).otp;
    expect(result.status).toBe(200);
    expect(otp).not.toBe("654321");
    expect(otp).toMatch(/^\d{6}$/);
    const { prisma } = await import("@/src/lib/prisma");
    expect((await prisma.user.findUnique({ where: { emailId: targetEmail } }))?.otp).toBe(otp);
  });

  it("returns a different current OTP on each regeneration", async () => {
    const admin = await makeAdmin();
    await makeUser({ emailId: targetEmail, teamId: admin.teamId });
    const first = await callUserRoute(regenerateOtp, targetEmail, { method: "POST", headers: await authHeader(admin) });
    const second = await callUserRoute(regenerateOtp, targetEmail, { method: "POST", headers: await authHeader(admin) });
    const firstOtp = (first.json as { otp: string }).otp;
    const secondOtp = (second.json as { otp: string }).otp;
    expect(firstOtp).toMatch(/^\d{6}$/);
    expect(secondOtp).toMatch(/^\d{6}$/);
    expect(secondOtp).not.toBe(firstOtp);
  });

  it("returns 404 when regenerating an unknown or admin account OTP", async () => {
    const admin = await makeAdmin();
    const missing = await callUserRoute(regenerateOtp, `missing@${domain}`, { method: "POST", headers: await authHeader(admin) });
    const own = await callUserRoute(regenerateOtp, admin.emailId, { method: "POST", headers: await authHeader(admin) });
    expect(missing).toMatchObject({ status: 404, json: { error: { code: "NOT_FOUND" } } });
    expect(own).toMatchObject({ status: 404, json: { error: { code: "NOT_FOUND" } } });
  });
});
