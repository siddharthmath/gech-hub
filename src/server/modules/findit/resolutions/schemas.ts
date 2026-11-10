import { ApiError } from "@/src/lib/errors";

export function parseResolutionInput(input: unknown) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "body", message: "Expected an object." }]);
  }
  const body = input as Record<string, unknown>;
  const extra = Object.keys(body).find((key) => key !== "claim_id" && key !== "note");
  if (extra) throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: extra, message: "Field is not allowed." }]);
  if (typeof body.claim_id !== "string" || !/^CLM-[A-F0-9]{8}$/.test(body.claim_id)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "claim_id", message: "Expected a CLM id." }]);
  }
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 500)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "note", message: "Note must be at most 500 characters." }]);
  }
  return { claimId: body.claim_id, note: typeof body.note === "string" ? body.note : null };
}

export function parseResolutionPostId(id: string) {
  if (!/^FND-[A-F0-9]{8}$/.test(id)) throw new ApiError(422, "VALIDATION_ERROR", "Expected an FND id.", [{ field: "id", message: "Expected an FND id." }]);
  return id;
}
