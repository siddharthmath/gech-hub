import { ApiError } from "@/src/lib/errors";
import { decodeCursor, parseLimit } from "@/src/lib/pagination";

export function parseQuestion(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "body", message: "Expected a JSON object." }]);
  const question = (body as Record<string, unknown>).question;
  if (typeof question !== "string" || question.trim().length < 5 || question.trim().length > 1000) throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "question", message: "Question must be 5 to 1000 characters." }]);
  return question.trim();
}

export function parseDoubtId(id: string) {
  if (!/^DBT-[0-9A-F]{8}$/.test(id)) throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "id", message: "ID must be a DBT doubt ID." }]);
  return id;
}

export function parseDoubtQuery(query: URLSearchParams) {
  const raw = query.get("answered");
  if (raw !== null && raw !== "true" && raw !== "false") throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "answered", message: "Answered must be true or false." }]);
  const cursor = query.get("cursor");
  return { answered: raw === null ? null : raw === "true", limit: parseLimit(query.get("limit")), cursor: cursor ? decodeCursor(cursor) : null };
}
