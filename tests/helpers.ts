import { prisma } from "@/src/lib/prisma";
import { signAccessToken } from "@/src/lib/jwt";
import type { Role, Team, User } from "@/src/generated/prisma/client";

export async function callRoute(
  handler: (request: Request) => Response | Promise<Response>,
  options: { method?: string; body?: unknown; headers?: HeadersInit; query?: Record<string, string> } = {},
) {
  const url = new URL("http://localhost/api/test");
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);
  const headers = new Headers(options.headers);
  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(options.body);
  }
  const response = await handler(new Request(url, init));
  return { status: response.status, json: await response.json() as unknown };
}

export function makeTeam(overrides: Partial<Pick<Team, "id" | "institution" | "emailDomain">> = {}) {
  return prisma.team.create({ data: { id: "test-team", institution: "Test Institution", emailDomain: "example.edu", ...overrides } });
}

export async function makeUser(overrides: Partial<Pick<User, "emailId" | "role" | "name" | "phoneNumber" | "usn" | "dept" | "designation" | "otp">> = {}) {
  const team = await makeTeam({ id: `team-${Math.random().toString(16).slice(2)}` });
  return prisma.user.create({
    data: { emailId: "student@example.edu", role: "student", name: "Example Student", otp: "123456", teamId: team.id, ...overrides },
  });
}

export function makeAdmin(overrides: Partial<Pick<User, "emailId" | "name" | "otp">> = {}) {
  return makeUser({ emailId: "admin@example.edu", name: "Administrator", role: "admin", otp: "123456", ...overrides });
}

export async function tokenFor(user: Pick<User, "emailId" | "role" | "dept" | "teamId">) {
  return signAccessToken({ sub: user.emailId, role: user.role satisfies Role, teamId: user.teamId, ...(user.dept ? { dept: user.dept } : {}) });
}

export async function authHeader(user: Pick<User, "emailId" | "role" | "dept" | "teamId">) {
  return { authorization: `Bearer ${await tokenFor(user)}` };
}
