import { ApiError } from "@/src/lib/errors";
import { decodeCursor, parseLimit } from "@/src/lib/pagination";

export function parseCreateClaim(input: unknown) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "body", message: "Expected an object." }]);
  }
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== "message")) {
    const field = Object.keys(body).find((key) => key !== "message") as string;
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field, message: "Field is not allowed." }]);
  }
  if (typeof body.message !== "string" || body.message.trim().length < 10 || body.message.trim().length > 1000) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "message", message: "Message must be 10 to 1000 characters." }]);
  }
  return { message: body.message.trim() };
}

export function parseClaimListQuery(query: URLSearchParams) {
  const limit = parseLimit(query.get("limit"));
  const rawCursor = query.get("cursor");
  return { limit, cursor: rawCursor ? decodeCursor(rawCursor) : null };
}
