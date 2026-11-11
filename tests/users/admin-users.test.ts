import { describe, expect, it } from "vitest";
import { GET as listUsers, POST as createUser } from "@/app/api/v1/admin/users/route";
import { authHeader, callRoute, makeAdmin, makeUser } from "@/tests/helpers";

const domain = process.env.TEAM_EMAIL_DOMAIN ?? "example.edu";
const email = (prefix: string) => `${prefix}@${domain}`;

describe("admin user creation and listing", () => {
  it("creates a student with a six-digit OTP and uppercases the USN", async () => {
    const admin = await makeAdmin();
    const result = await callRoute(createUser, { method: "POST", headers: await authHeader(admin), body: {
      role: "student", name: "Test Student", usn: "ab123", dept: "CSE", email_id: email("new-student"), phone_number: "9876543210",
    } });
    expect(result.status).toBe(201);
    expect(result.json).toMatchObject({ role: "student", usn: "AB123", email_id: email("new-student") });
    expect((result.json as { otp: string }).otp).toMatch(/^\d{6}$/);
    const { prisma } = await import("@/src/lib/prisma");
    expect(await prisma.user.findUnique({ where: { emailId: email("new-student") } })).toMatchObject({ usn: "AB123" });
  });

  it.each([
    ["faculty", { designation: "Professor" }, ["designation"]],
    ["office_staff", { dept: "Admin", designation: "Clerk" }, ["dept", "designation"]],
  ] as const)("creates %s with only its own fields", async (role, extra, allowedFields) => {
    const admin = await makeAdmin();
    const result = await callRoute(createUser, { method: "POST", headers: await authHeader(admin), body: {
      role, name: "Test Person", email_id: email(`new-${role}`), phone_number: "9876543210", ...extra,
    } });
    expect(result.status).toBe(201);
    const object = result.json as Record<string, unknown>;
    expect(Object.keys(object).filter((key) => ["usn", "dept", "designation"].includes(key)).sort()).toEqual([...allowedFields].sort());
  });

  it("rejects duplicate emails", async () => {
    const admin = await makeAdmin();
    await makeUser({ emailId: email("taken") });
    const result = await callRoute(createUser, { method: "POST", headers: await authHeader(admin), body: {
      role: "student", name: "Test Student", usn: "AB123", dept: "CSE", email_id: email("taken"), phone_number: "9876543210",
    } });
    expect(result.status).toBe(409);
    expect(result.json).toMatchObject({ error: { code: "ALREADY_EXISTS" } });
  });

  it("rejects a different email domain", async () => {
    const admin = await makeAdmin();
    const result = await callRoute(createUser, { method: "POST", headers: await authHeader(admin), body: {
      role: "student", name: "Test Student", usn: "AB123", dept: "CSE", email_id: "person@outside.invalid", phone_number: "9876543210",
    } });
    expect(result.status).toBe(422);
    expect(result.json).toMatchObject({ error: { code: "EMAIL_DOMAIN_MISMATCH" } });
  });

  it("rejects fields that do not belong to the chosen role", async () => {
    const admin = await makeAdmin();
    const result = await callRoute(createUser, { method: "POST", headers: await authHeader(admin), body: {
      role: "faculty", name: "Test Person", designation: "Professor", email_id: email("faculty"), phone_number: "9876543210", usn: "AB123",
    } });
    expect(result.status).toBe(422);
    expect(result.json).toMatchObject({ error: { code: "FIELD_NOT_ALLOWED_FOR_ROLE", details: [{ field: "usn" }] } });
  });

  it.each([
    ["missing phone", { role: "student", name: "Test Student", usn: "AB123", dept: "CSE", email_id: email("missing-phone") }],
    ["international phone", { role: "student", name: "Test Student", usn: "AB123", dept: "CSE", email_id: email("intl-phone"), phone_number: "+919876543210" }],
    ["short phone", { role: "student", name: "Test Student", usn: "AB123", dept: "CSE", email_id: email("short-phone"), phone_number: "987654321" }],
    ["short USN", { role: "student", name: "Test Student", usn: "ab1", dept: "CSE", email_id: email("short-usn"), phone_number: "9876543210" }],
    ["admin role", { role: "admin", name: "Test Admin", email_id: email("bad-role"), phone_number: "9876543210" }],
  ])("validates %s", async (_case, body) => {
    const admin = await makeAdmin();
    const result = await callRoute(createUser, { method: "POST", headers: await authHeader(admin), body });
    expect(result.status).toBe(422);
    expect(result.json).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it.each(["student token", "no token"])("requires admin access for creation (%s)", async (kind) => {
    const student = await makeUser();
    const result = await callRoute(createUser, {
      method: "POST", headers: kind === "student token" ? await authHeader(student) : undefined,
      body: { role: "student", name: "Test Student", usn: "AB123", dept: "CSE", email_id: email("blocked"), phone_number: "9876543210" },
    });
    expect(result.status).toBe(kind === "student token" ? 403 : 401);
    expect(result.json).toMatchObject({ error: { code: kind === "student token" ? "FORBIDDEN" : "UNAUTHORIZED" } });
  });

  it("returns newest users in cursor pages and includes their OTPs", async () => {
    const admin = await makeAdmin();
    const headers = await authHeader(admin);
    const common = { name: "Test Student", usn: "AB123", dept: "CSE", phone_number: "9876543210" };
    for (const prefix of ["page-a", "page-b", "page-c"]) {
      expect((await callRoute(createUser, { method: "POST", headers, body: { ...common, role: "student", email_id: email(prefix) } })).status).toBe(201);
    }
    const first = await callRoute(listUsers, { headers, query: { limit: "2" } });
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ count: 2 });
    const pageOne = first.json as { items: Array<{ email_id: string; otp: string }>; next_cursor: string | null };
    expect(pageOne.next_cursor).toBeTruthy();
    expect(pageOne.items.every((item) => /^\d{6}$/.test(item.otp))).toBe(true);
    const second = await callRoute(listUsers, { headers, query: { limit: "2", cursor: pageOne.next_cursor! } });
    expect(second.json).toMatchObject({ count: 1, next_cursor: null });
    expect([...pageOne.items, ...((second.json as { items: Array<{ email_id: string }> }).items)].some((item) => item.email_id === admin.emailId)).toBe(false);
  });

  it("filters by role and rejects admin as a list filter", async () => {
    const admin = await makeAdmin();
    const headers = await authHeader(admin);
    await callRoute(createUser, { method: "POST", headers, body: { role: "faculty", name: "Professor", designation: "Faculty", email_id: email("filter-faculty"), phone_number: "9876543210" } });
    await callRoute(createUser, { method: "POST", headers, body: { role: "student", name: "Student", usn: "AB123", dept: "CSE", email_id: email("filter-student"), phone_number: "9876543210" } });
    const result = await callRoute(listUsers, { headers, query: { role: "faculty" } });
    expect((result.json as { items: Array<{ role: string }> }).items.every((item) => item.role === "faculty")).toBe(true);
    const invalid = await callRoute(listUsers, { headers, query: { role: "admin" } });
    expect(invalid.status).toBe(422);
    expect(invalid.json).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("rejects student access and unauthenticated list requests", async () => {
    const student = await makeUser();
    for (const [headers, status, code] of [[await authHeader(student), 403, "FORBIDDEN"], [undefined, 401, "UNAUTHORIZED"]] as const) {
      const result = await callRoute(listUsers, { headers });
      expect(result.status).toBe(status);
      expect(result.json).toMatchObject({ error: { code } });
    }
  });
});
