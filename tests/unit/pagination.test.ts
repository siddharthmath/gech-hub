import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, getPage, parseLimit } from "@/src/lib/pagination";

describe("pagination", () => {
  it("round-trips an opaque cursor", () => {
    const position = { createdAt: new Date("2026-01-02T03:04:05.000Z"), id: "FND-123" };
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it("does not claim another page when the data ends at the limit", () => {
    const rows = [1, 2, 3].map((id) => ({ id: String(id), createdAt: new Date("2026-01-02T03:04:05.000Z") }));
    expect(getPage(rows, 3)).toEqual({ items: rows, count: 3, next_cursor: null, hasNext: false });
  });

  it("defaults to 25 and rejects out-of-range limits", () => {
    expect(parseLimit(null)).toBe(25);
    expect(parseLimit("100")).toBe(100);
    expect(() => parseLimit("101")).toThrow();
  });
});
