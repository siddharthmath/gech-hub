import { z } from "zod";
import { decodeCursor, parseLimit } from "@/src/lib/pagination";

function isCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const lostOnSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine(isCalendarDate, "Use a valid calendar date.")
  .refine((value) => value <= new Date().toISOString().slice(0, 10), "Date cannot be in the future.");

export const createLostRequestSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).optional(),
  location_lost: z.string().trim().min(2).max(120).optional(),
  lost_on: lostOnSchema.optional(),
}).strict();

export function parseLostRequestListQuery(query: URLSearchParams) {
  const status = z.enum(["active", "archived"]).parse(query.get("status") ?? "active");
  const mine = z.enum(["true", "false"]).parse(query.get("mine") ?? "false");
  const rawCursor = query.get("cursor");
  return {
    status,
    mine: mine === "true",
    limit: parseLimit(query.get("limit")),
    cursor: rawCursor ? decodeCursor(rawCursor) : null,
  };
}
