import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signAccessToken, verifyAccessToken } from "@/src/lib/jwt";

const payload = { sub: "a@example.edu", role: "STUDENT", teamId: "team-1", dept: "CS" };

describe("access tokens", () => {
  it("signs and verifies a token", async () => {
    const token = await signAccessToken(payload);
    expect(await verifyAccessToken(token)).toEqual(payload);
  });

  it("rejects an expired token", async () => {
    const key = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ role: payload.role, teamId: payload.teamId })
      .setProtectedHeader({ alg: "HS256" }).setSubject(payload.sub).setIssuedAt(1).setExpirationTime(2).sign(key);
    await expect(verifyAccessToken(token)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
  });

  it("rejects a tampered payload", async () => {
    const token = await signAccessToken(payload);
    const segments = token.split(".");
    const header = segments[0];
    const signature = segments[2];
    const changedPayload = Buffer.from(JSON.stringify({ ...payload, role: "ADMIN" })).toString("base64url");
    await expect(verifyAccessToken(`${header}.${changedPayload}.${signature}`)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  });
});
