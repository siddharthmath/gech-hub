import { describe, expect, it } from "vitest";
import { GET, PATCH } from "@/app/api/v1/admin/users/[email_id]/route";
import { authHeader, makeAdmin, makeUser } from "@/tests/helpers";

const domain = process.env.TEAM_EMAIL_DOMAIN ?? "example.edu";
const studentEmail = `edit-student@${domain}`;

async function callDetail(
  handler: typeof GET | typeof PATCH,
  emailId: string,
  options: { method?: string; headers?: HeadersInit; body?: unknown } = {},
) {
  const headers = new Headers(options.headers);
  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(options.body);
  }
  const response = await handler(new Request(`http://localhost/api/v1/admin/users/${encodeURIComponent(emailId)}`, init), {
    params: Promise.resolve({ email_id: emailId }),
  });
  return { status: response.status, json: await response.json() as unknown };
}

describe("admin user view and edit", () => {
  it("gets a student including OTP and normalizes the email", async () => {
    const admin = await makeAdmin();
    await makeUser({ emailId: studentEmail, teamId: admin.teamId, otp: "654321" });
    const result = await callDetail(GET, studentEmail.toUpperCase(), { headers: await authHeader(admin) });
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({ email_id: studentEmail, otp: "654321", role: "student" });
  });

  it.each(["missing user", "admin account"])("returns 404 for a %s", async (kind) => {
    const admin = await makeAdmin();
    const emailId = kind === "admin account" ? admin.emailId : `missing@${domain}`;
    const result = await callDetail(GET, emailId, { headers: await authHeader(admin) });
    expect(result.status).toBe(404);
    expect(result.json).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("requires admin authentication", async () => {
    const admin = await makeAdmin();
    const student = await makeUser();
    const forbidden = await callDetail(GET, studentEmail, { headers: await authHeader(student) });
    const unauthorized = await callDetail(GET, studentEmail);
    const patchForbidden = await callDetail(PATCH, studentEmail, { method: "PATCH", headers: await authHeader(student), body: { name: "Blocked Update" } });
    expect(forbidden).toMatchObject({ status: 403, json: { error: { code: "FORBIDDEN" } } });
    expect(unauthorized).toMatchObject({ status: 401, json: { error: { code: "UNAUTHORIZED" } } });
    expect(patchForbidden).toMatchObject({ status: 403, json: { error: { code: "FORBIDDEN" } } });
  });

  it("updates a phone and department while preserving OTP and updates the row", async () => {
    const admin = await makeAdmin();
    await makeUser({ emailId: studentEmail, teamId: admin.teamId, otp: "654321", phoneNumber: "9876543210" });
    const result = await callDetail(PATCH, studentEmail, {
      method: "PATCH", headers: await authHeader(admin), body: { phone_number: "0123456789", dept: "Physics" },
    });
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({ phone_number: "0123456789", dept: "Physics", otp: "654321" });
    const { prisma } = await import("@/src/lib/prisma");
    expect(await prisma.user.findUnique({ where: { emailId: studentEmail } })).toMatchObject({ phoneNumber: "0123456789", dept: "Physics", otp: "654321" });
  });

  it.each([
    [{ role: "student" }, "VALIDATION_ERROR"],
    [{ email_id: studentEmail }, "VALIDATION_ERROR"],
    [{}, "VALIDATION_ERROR"],
    [{ phone_number: "+919876543210" }, "VALIDATION_ERROR"],
  ])("rejects invalid update bodies", async (body, code) => {
    const admin = await makeAdmin();
    await makeUser({ emailId: studentEmail, teamId: admin.teamId });
    const result = await callDetail(PATCH, studentEmail, { method: "PATCH", headers: await authHeader(admin), body });
    expect(result.status).toBe(422);
    expect(result.json).toMatchObject({ error: { code } });
    if ("phone_number" in body) expect(result.json).toMatchObject({ error: { details: [{ field: "phone_number" }] } });
  });

  it("rejects fields that do not apply to the user's role", async () => {
    const admin = await makeAdmin();
    const facultyEmail = `faculty@${domain}`;
    await makeUser({ emailId: facultyEmail, role: "faculty", teamId: admin.teamId });
    const result = await callDetail(PATCH, facultyEmail, { method: "PATCH", headers: await authHeader(admin), body: { usn: "AB123" } });
    expect(result.status).toBe(422);
    expect(result.json).toMatchObject({ error: { code: "FIELD_NOT_ALLOWED_FOR_ROLE" } });
  });

  it("returns 404 for a missing patch target", async () => {
    const admin = await makeAdmin();
    const result = await callDetail(PATCH, `missing@${domain}`, { method: "PATCH", headers: await authHeader(admin), body: { name: "Updated Name" } });
    expect(result.status).toBe(404);
    expect(result.json).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
