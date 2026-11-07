import { ApiError } from "@/src/lib/errors";
import { countRecentAttempts, createLoginAttempt, deleteAttemptsForKey } from "@/src/server/modules/auth/repository";

export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function assertNotLocked(key: string) {
  const count = await countRecentAttempts(key, new Date(Date.now() - LOGIN_WINDOW_MS));
  if (count >= LOGIN_FAILURE_LIMIT) throw new ApiError(429, "RATE_LIMITED", "Too many failed sign-in attempts. Try again later.");
}

export async function recordFailure(key: string) {
  await createLoginAttempt(key);
}

export async function resetFailures(key: string) {
  await deleteAttemptsForKey(key);
}
