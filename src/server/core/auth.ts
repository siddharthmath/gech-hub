import { ApiError } from "@/src/lib/errors";
import { getBearerToken, verifyAccessToken } from "@/src/lib/jwt";
import { findUserByEmail } from "@/src/server/modules/auth/repository";

export async function requireAuth(request: Request, options: { roles?: string[] } = {}) {
  const claims = await verifyAccessToken(getBearerToken(request.headers.get("authorization")));
  const user = await findUserByEmail(claims.sub);
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "The account for this token no longer exists.");
  if (user.role !== claims.role || user.teamId !== claims.teamId) {
    throw new ApiError(401, "INVALID_TOKEN", "The access token is invalid.");
  }
  if (options.roles && !options.roles.includes(user.role)) throw new ApiError(403, "FORBIDDEN", "You do not have permission to access this resource.");
  return user;
}
