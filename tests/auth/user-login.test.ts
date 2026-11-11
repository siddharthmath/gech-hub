import { describe, expect, it } from "vitest";
import { jwtVerify } from "jose";
import { GET as me } from "@/app/api/v1/users/me/route";
import { POST as userLogin } from "@/app/api/v1/auth/login/route";
import { makeAdmin, makeUser, callRoute, tokenFor } from "@/tests/helpers";
import { prisma } from "@/src/lib/prisma";

function auth(token: string) { return { authorization: `Bearer ${token}` }; }

describe("user sign-in and profile", () => {
  it("signs in a student and returns the role scoped profile", async () => {
    const student = await makeUser({ usn: "1ABCD23", dept: "Computer Science", phoneNumber: "9876543210" });
    const result = await callRoute(userLogin, { method: "POST", body: { email_id: " STUDENT@EXAMPLE.EDU ", otp: "123456" } });
    expect(result.status).toBe(200);
    const body = result.json as { access_token: string; expires_in: number; profile: Record<string, unknown> };
    expect(body.expires_in).toBe(43200);
    expect(body.profile).toEqual({ email_id: student.emailId, role: "student", name: student.name, phone_number: student.phoneNumber, usn: student.usn, dept: student.dept });
    expect(body.profile).not.toHaveProperty("otp");
    const { payload } = await jwtVerify(body.access_token, new TextEncoder().encode(process.env.JWT_SECRET));
    expect(payload).toMatchObject({ sub: student.emailId, role: "student", teamId: student.teamId });
    expect(payload).not.toHaveProperty("dept");
  });

  it("includes dept in office staff tokens and profile fields", async () => {
    const staff = await makeUser({ role: "office_staff", dept: "Library", designation: "Assistant" });
    const result = await callRoute(userLogin, { method: "POST", body: { email_id: staff.emailId, otp: staff.otp } });
    expect(result.status).toBe(200);
    const body = result.json as { access_token: string; profile: Record<string, unknown> };
    expect(body.profile).toMatchObject({ role: "office_staff", dept: "Library", designation: "Assistant" });
    expect((await jwtVerify(body.access_token, new TextEncoder().encode(process.env.JWT_SECRET))).payload.dept).toBe("Library");
  });

  it.each([["wrong OTP", "student@example.edu", "000000"], ["unknown account", "missing@example.edu", "123456"]])("rejects %s with indistinguishable credentials", async (_case, email, otp) => {
    await makeUser();
    const result = await callRoute(userLogin, { method: "POST", body: { email_id: email, otp } });
    expect(result.status).toBe(401);
    expect(result.json).toMatchObject({ error: { code: "INVALID_CREDENTIALS", message: "Email or one-time password is incorrect." } });
  });

  it("rejects emails outside the configured institution", async () => {
    const result = await callRoute(userLogin, { method: "POST", body: { email_id: "student@other.edu", otp: "123456" } });
    expect(result.status).toBe(400);
    expect(result.json).toMatchObject({ error: { code: "UNKNOWN_INSTITUTION" } });
  });

  it("directs admin accounts to admin login", async () => {
    await makeAdmin();
    const result = await callRoute(userLogin, { method: "POST", body: { email_id: "admin@example.edu", otp: "123456" } });
    expect(result.status).toBe(403);
    expect(result.json).toMatchObject({ error: { code: "USE_ADMIN_LOGIN", message: "Use the admin login." } });
  });

  it("accepts a regenerated OTP and rejects the previous value", async () => {
    const student = await makeUser();
    await prisma.user.update({ where: { emailId: student.emailId }, data: { otp: "654321" } });
    expect((await callRoute(userLogin, { method: "POST", body: { email_id: student.emailId, otp: "123456" } })).status).toBe(401);
    expect((await callRoute(userLogin, { method: "POST", body: { email_id: student.emailId, otp: "654321" } })).status).toBe(200);
  });

  it("locks after five failed attempts", async () => {
    await makeUser();
    for (let attempt = 0; attempt < 5; attempt += 1) await callRoute(userLogin, { method: "POST", body: { email_id: "student@example.edu", otp: "000000" } });
    const result = await callRoute(userLogin, { method: "POST", body: { email_id: "student@example.edu", otp: "123456" } });
    expect(result.status).toBe(429);
    expect(result.json).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  it("validates missing email", async () => {
    const result = await callRoute(userLogin, { method: "POST", body: { otp: "123456" } });
    expect(result.status).toBe(422);
    expect(result.json).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("reads a fresh profile for the authenticated account", async () => {
    const student = await makeUser({ usn: "1ABCD23", dept: "Computer Science" });
    const token = await tokenFor(student);
    await prisma.user.update({ where: { emailId: student.emailId }, data: { phoneNumber: "0123456789" } });
    const result = await callRoute(me, { headers: auth(token) });
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({ role: "student", usn: "1ABCD23", dept: "Computer Science", phone_number: "0123456789" });
    expect(result.json).not.toHaveProperty("designation");
    expect(result.json).not.toHaveProperty("otp");
  });

  it("includes office staff fields and forbids admin profiles", async () => {
    const staff = await makeUser({ role: "office_staff", dept: "Library", designation: "Assistant" });
    const staffResult = await callRoute(me, { headers: auth(await tokenFor(staff)) });
    expect(staffResult.json).toMatchObject({ dept: "Library", designation: "Assistant" });
    const admin = await makeAdmin();
    const adminResult = await callRoute(me, { headers: auth(await tokenFor(admin)) });
    expect(adminResult.status).toBe(403);
    expect(adminResult.json).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("returns the standard missing, malformed, and expired token errors", async () => {
    expect((await callRoute(me)).json).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect((await callRoute(me, { headers: auth("bad") })).json).toMatchObject({ error: { code: "INVALID_TOKEN" } });
    const student = await makeUser();
    const { SignJWT } = await import("jose");
    const expired = await new SignJWT({ role: student.role, teamId: student.teamId }).setProtectedHeader({ alg: "HS256" }).setSubject(student.emailId).setIssuedAt(1).setExpirationTime(2).sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect((await callRoute(me, { headers: auth(expired) })).json).toMatchObject({ error: { code: "TOKEN_EXPIRED" } });
  });
});
