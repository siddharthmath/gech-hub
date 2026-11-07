import { describe, expect, it } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { GET as adminMe } from "@/app/api/v1/admin/me/route";
import { POST as adminLogin } from "@/app/api/v1/auth/admin/login/route";
import { makeAdmin, makeUser, callRoute, tokenFor } from "@/tests/helpers";

function auth(token: string) { return { authorization: `Bearer ${token}` }; }

describe("admin sign-in and profile", () => {
  it("signs in an admin and returns a verifiable 12-hour token", async () => {
    await makeAdmin();
    const result = await callRoute(adminLogin, { method: "POST", body: { email_id: "admin@example.edu", otp: "123456" } });
    expect(result.status).toBe(200);
    const body = result.json as { access_token: string; expires_in: number; profile: { email_id: string; role: string } };
    expect(body.expires_in).toBe(43200);
    expect(body.profile).toEqual({ email_id: "admin@example.edu", name: "Administrator", role: "admin" });
    const verified = await jwtVerify(body.access_token, new TextEncoder().encode(process.env.JWT_SECRET));
    expect(verified.payload.role).toBe("admin");
  });

  it("normalizes email casing and whitespace", async () => {
    await makeAdmin();
    expect((await callRoute(adminLogin, { method: "POST", body: { email_id: "  ADMIN@EXAMPLE.EDU ", otp: "123456" } })).status).toBe(200);
  });

  it.each([
    ["wrong OTP", "admin@example.edu", "000000"],
    ["unknown email", "missing@example.edu", "123456"],
  ])("rejects %s with indistinguishable credentials", async (_case, email, otp) => {
    await makeAdmin();
    const result = await callRoute(adminLogin, { method: "POST", body: { email_id: email, otp } });
    expect(result.status).toBe(401);
    expect(result.json).toMatchObject({ error: { code: "INVALID_CREDENTIALS", message: "Email or one-time password is incorrect." } });
  });

  it("rejects a student's correct OTP", async () => {
    await makeUser();
    const result = await callRoute(adminLogin, { method: "POST", body: { email_id: "student@example.edu", otp: "123456" } });
    expect(result.status).toBe(401);
    expect(result.json).toMatchObject({ error: { code: "INVALID_CREDENTIALS" } });
  });

  it("validates required OTP", async () => {
    const result = await callRoute(adminLogin, { method: "POST", body: { email_id: "admin@example.edu" } });
    expect(result.status).toBe(422);
    expect(result.json).toMatchObject({ error: { code: "VALIDATION_ERROR", details: [{ field: "otp" }] } });
  });

  it("locks the account key after five failures", async () => {
    await makeAdmin();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await callRoute(adminLogin, { method: "POST", body: { email_id: "admin@example.edu", otp: "000000" } });
    }
    const result = await callRoute(adminLogin, { method: "POST", body: { email_id: "admin@example.edu", otp: "123456" } });
    expect(result.status).toBe(429);
    expect(result.json).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  it("returns the authenticated admin profile without credentials", async () => {
    const admin = await makeAdmin();
    const result = await callRoute(adminMe, { headers: auth(await tokenFor(admin)) });
    expect(result.status).toBe(200);
    expect(result.json).toEqual({ email_id: admin.emailId, name: admin.name, role: "admin" });
    expect(result.json).not.toHaveProperty("otp");
  });

  it("rejects a missing bearer token", async () => {
    const result = await callRoute(adminMe);
    expect(result.status).toBe(401);
    expect(result.json).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("rejects a malformed token", async () => {
    const result = await callRoute(adminMe, { headers: auth("garbage") });
    expect(result.status).toBe(401);
    expect(result.json).toMatchObject({ error: { code: "INVALID_TOKEN" } });
  });

  it("rejects an expired token", async () => {
    const admin = await makeAdmin();
    const token = await new SignJWT({ role: "admin", teamId: "test" }).setProtectedHeader({ alg: "HS256" })
      .setSubject(admin.emailId).setIssuedAt(1).setExpirationTime(2)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    const result = await callRoute(adminMe, { headers: auth(token) });
    expect(result.status).toBe(401);
    expect(result.json).toMatchObject({ error: { code: "TOKEN_EXPIRED" } });
  });

  it("forbids a valid student token", async () => {
    const student = await makeUser();
    const result = await callRoute(adminMe, { headers: auth(await tokenFor(student)) });
    expect(result.status).toBe(403);
    expect(result.json).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("rejects a token when its admin account was deleted", async () => {
    const admin = await makeAdmin();
    const token = await tokenFor(admin);
    const { prisma } = await import("@/src/lib/prisma");
    await prisma.user.delete({ where: { emailId: admin.emailId } });
    const result = await callRoute(adminMe, { headers: auth(token) });
    expect(result.status).toBe(401);
    expect(result.json).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });
});
