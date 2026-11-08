import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { signAccessToken } from "@/src/lib/jwt";
import { assertNotLocked, recordFailure, resetFailures } from "@/src/server/core/rate-limit";
import { findAdminByEmail, findUserByEmail } from "@/src/server/modules/auth/repository";
import { adminProfile } from "@/src/server/modules/auth/serializer";
import { userProfile } from "@/src/server/modules/users/serializer";

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

export async function loginUser(emailId: string, otp: string) {
  const key = `user:${emailId}`;
  await assertNotLocked(key);

  const admin = await findAdminByEmail(emailId);
  if (admin) throw new ApiError(403, "USE_ADMIN_LOGIN", "Use the admin login.");

  const domain = process.env.TEAM_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain || emailId.split("@")[1] !== domain) {
    throw new ApiError(400, "UNKNOWN_INSTITUTION", "This email is not from the configured institution.");
  }

  const user = await findUserByEmail(emailId);
  const otpMatches = sameSecret(otp, user?.otp ?? "000000");
  if (!user || user.role === "admin" || !otpMatches) {
    await recordFailure(key);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or one-time password is incorrect.");
  }

  await resetFailures(key);
  const accessToken = await signAccessToken({
    sub: user.emailId,
    role: user.role,
    teamId: user.teamId,
    ...(user.role === "office_staff" && user.dept ? { dept: user.dept } : {}),
  });
  return { access_token: accessToken, expires_in: 43200, profile: userProfile(user) };
}
