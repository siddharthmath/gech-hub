import { describe, expect, it } from "vitest";
import { createId, parseId } from "@/src/lib/ids";

describe("ids", () => {
  it("generates ids with the requested prefix", () => {
    const id = createId("FND");
    expect(id).toMatch(/^FND-/);
    expect(parseId(id, "FND")).toBe(id);
  });

  it("rejects ids of the wrong kind", () => {
    expect(() => parseId(createId("CLM"), "FND")).toThrow();
  });
});
