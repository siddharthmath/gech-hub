import { ApiError } from "@/src/lib/errors";

export type CursorPosition = { createdAt: Date; id: string };
export type CursorRow = CursorPosition;

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(`${position.createdAt.toISOString()}|${position.id}`).toString("base64url");
}

export function decodeCursor(cursor: string): CursorPosition {
  try {
    const [date, id, ...extra] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    const createdAt = new Date(date);
    if (extra.length || !id || Number.isNaN(createdAt.getTime())) throw new Error("bad cursor");
    return { createdAt, id };
  } catch {
    throw new ApiError(422, "VALIDATION_ERROR", "The pagination cursor is invalid.", [
      { field: "cursor", message: "The pagination cursor is invalid." },
    ]);
  }
}

export function parseLimit(rawLimit: string | null): number {
  if (rawLimit === null) return 25;
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(422, "VALIDATION_ERROR", "The limit must be an integer from 1 to 100.", [
      { field: "limit", message: "The limit must be an integer from 1 to 100." },
    ]);
  }
  return limit;
}

export function getPage<T extends CursorRow>(rows: T[], limit: number) {
  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);
  const lastItem = items.at(-1);
  return {
    items,
    count: items.length,
    next_cursor: hasNext && lastItem ? encodeCursor(lastItem) : null,
    hasNext,
  };
}
