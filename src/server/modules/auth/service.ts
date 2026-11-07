import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { signAccessToken } from "@/src/lib/jwt";
import { assertNotLocked, recordFailure, resetFailures } from "@/src/server/core/rate-limit";
import { findAdminByEmail } from "@/src/server/modules/auth/repository";
import { adminProfile } from "@/src/server/modules/auth/serializer";

function sameSecret(candidate: string, expected: string) {
  const left = createHash("sha256").update(candidate).digest();
  const right = createHash("sha256").update(expected).digest();
  const digestMatches = timingSafeEqual(left, right);
  return digestMatches && candidate.length === expected.length;
}

export async function loginAdmin(emailId: string, otp: string) {
  const key = `admin:${emailId}`;
  await assertNotLocked(key);
  const user = await findAdminByEmail(emailId);
  if (!user || !sameSecret(otp, user.otp)) {
    await recordFailure(key);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or one-time password is incorrect.");
  }

  await resetFailures(key);
  const accessToken = await signAccessToken({
    sub: user.emailId,
    role: user.role,
    teamId: user.teamId,
    ...(user.dept ? { dept: user.dept } : {}),
  });
  return { access_token: accessToken, expires_in: 43200, profile: adminProfile(user) };
}
