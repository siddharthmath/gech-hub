import { ApiError } from "@/src/lib/errors";
import { decodeCursor, parseLimit } from "@/src/lib/pagination";
import { validateFile, type ValidatedUpload } from "@/src/server/core/uploads";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const attachmentTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
function invalid(field: string, message: string): never { throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field, message }]); }

function parsePublishAt(raw: FormDataEntryValue | null): Date | null {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return invalid("publish_at", "Expected a date and time.");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const localValue = /T\d{2}:\d{2}$/.test(raw) ? `${raw}:00` : raw;
  const date = new Date(hasZone ? raw : `${localValue}+05:30`);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) invalid("publish_at", "Publish time must be in the future.");
  return date;
}

export async function parseCreateNotice(form: FormData) {
  const title = form.get("title"); const body = form.get("body"); const rawPinned = form.get("pinned");
  if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 150) invalid("title", "Title must be 3 to 150 characters.");
  if (typeof body !== "string" || body.trim().length < 3 || body.trim().length > 5000) invalid("body", "Body must be 3 to 5000 characters.");
  if (rawPinned !== null && rawPinned !== "true" && rawPinned !== "false") invalid("pinned", "Pinned must be true or false.");
  const publishAt = parsePublishAt(form.get("publish_at"));
  const attachmentEntries = form.getAll("attachment");
  if (attachmentEntries.length > 1) invalid("attachment", "Only one attachment is allowed.");
  const attachmentEntry = attachmentEntries[0] ?? null;
  let attachment: ValidatedUpload | null = null;
  if (attachmentEntry !== null) {
    if (!(attachmentEntry instanceof File)) invalid("attachment", "Attachment must be a file.");
    attachment = await validateFile(attachmentEntry, { types: attachmentTypes, maxBytes: MAX_ATTACHMENT_BYTES });
  }
  return { title: title.trim(), body: body.trim(), pinned: rawPinned === "true", publishAt, attachment };
}

export function parseNoticeListQuery(query: URLSearchParams) {
  const status = query.get("status") ?? "active";
  if (status !== "active" && status !== "scheduled" && status !== "archived") invalid("status", "Status must be active, scheduled, or archived.");
  const pinnedRaw = query.get("pinned");
  if (pinnedRaw !== null && pinnedRaw !== "true" && pinnedRaw !== "false") invalid("pinned", "Pinned must be true or false.");
  const cursorRaw = query.get("cursor");
  return { status: status as "active" | "scheduled" | "archived", pinned: pinnedRaw === null ? null : pinnedRaw === "true", limit: parseLimit(query.get("limit")), cursor: cursorRaw ? decodeCursor(cursorRaw) : null };
}
