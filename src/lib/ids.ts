import { randomBytes } from "node:crypto";
import { ApiError } from "@/src/lib/errors";

export const ID_PREFIXES = ["FND", "CLM", "LST", "NTC", "DBT", "DTY", "DRQ", "ITY", "TKT"] as const;
export type IdPrefix = (typeof ID_PREFIXES)[number];

export function createId(prefix: IdPrefix): string {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

export function parseId(value: string, expectedPrefix: IdPrefix): string {
  if (!new RegExp(`^${expectedPrefix}-[a-f0-9]{16}$`).test(value)) {
    throw new ApiError(422, "VALIDATION_ERROR", `Expected an id with prefix ${expectedPrefix}.`, [
      { field: "id", message: `Expected an id with prefix ${expectedPrefix}.` },
    ]);
  }
  return value;
}
