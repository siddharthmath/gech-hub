import { SignJWT, jwtVerify } from "jose";
import { ApiError } from "@/src/lib/errors";

export type AccessTokenPayload = {
  sub: string;
  role: string;
  teamId: string;
  dept?: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be configured");
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  if (new TextEncoder().encode(process.env.JWT_SECRET ?? "").byteLength < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  return new SignJWT({ role: payload.role, teamId: payload.teamId, ...(payload.dept ? { dept: payload.dept } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    if (new TextEncoder().encode(process.env.JWT_SECRET ?? "").byteLength < 32) {
      throw new Error("JWT_SECRET must contain at least 32 characters");
    }
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], clockTolerance: 0 });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string" || typeof payload.teamId !== "string") {
      throw new Error("invalid claims");
    }
    return {
      sub: payload.sub,
      role: payload.role,
      teamId: payload.teamId,
      ...(typeof payload.dept === "string" ? { dept: payload.dept } : {}),
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ERR_JWT_EXPIRED") throw new ApiError(401, "TOKEN_EXPIRED", "The access token has expired.");
    throw new ApiError(401, "INVALID_TOKEN", "The access token is invalid.");
  }
}

export function getBearerToken(authorization: string | null): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "UNAUTHORIZED", "A bearer token is required.");
  return match[1];
}
