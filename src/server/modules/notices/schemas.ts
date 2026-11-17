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

export async function parseUpdateNotice(request: Request, parsedBody: unknown) {
  const contentType = request.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await request.formData() : null;
  let body: Record<string, unknown> = {};
  if (!form) {
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) invalid("body", "Expected a JSON object.");
    body = parsedBody as Record<string, unknown>;
  }
  const has = (key: string) => form ? form.has(key) : Object.hasOwn(body, key);
  const get = (key: string) => form ? form.get(key) : body[key];
  if (!form && Object.keys(body).length === 0 || form && [...form.keys()].length === 0) invalid("body", "At least one field is required.");
  const data: { title?: string; body?: string; pinned?: boolean; status?: "active" | "archived"; publishAt?: Date | null; removeAttachment?: boolean; attachment?: ValidatedUpload } = {};
  if (has("title")) { const value = get("title"); if (typeof value !== "string" || value.trim().length < 3 || value.trim().length > 150) invalid("title", "Title must be 3 to 150 characters."); data.title = value.trim(); }
  if (has("body")) { const value = get("body"); if (typeof value !== "string" || value.trim().length < 3 || value.trim().length > 5000) invalid("body", "Body must be 3 to 5000 characters."); data.body = value.trim(); }
  if (has("pinned")) { const value = get("pinned"); if (value !== true && value !== false && value !== "true" && value !== "false") invalid("pinned", "Pinned must be true or false."); data.pinned = value === true || value === "true"; }
  if (has("status")) { const value = get("status"); if (value !== "active" && value !== "archived") invalid("status", "Status must be active or archived."); data.status = value; }
  if (has("publish_at")) { const value = get("publish_at"); if (value === null) data.publishAt = null; else { if (typeof value !== "string") invalid("publish_at", "Expected a date and time."); data.publishAt = parsePublishAt(value); } }
  if (has("remove_attachment")) { const value = get("remove_attachment"); if (value !== true && value !== "true") invalid("remove_attachment", "Expected true."); data.removeAttachment = true; }
  const entries = form?.getAll("attachment") ?? [];
  if (entries.length > 1 || !form && has("attachment")) invalid("attachment", "Attachment must be uploaded as a file.");
  if (entries[0] !== undefined) { if (!(entries[0] instanceof File)) invalid("attachment", "Attachment must be a file."); data.attachment = await validateFile(entries[0], { types: attachmentTypes, maxBytes: MAX_ATTACHMENT_BYTES }); }
  return data;
}

export function parseNoticeListQuery(query: URLSearchParams) {
  const status = query.get("status") ?? "active";
  if (status !== "active" && status !== "scheduled" && status !== "archived") invalid("status", "Status must be active, scheduled, or archived.");
  const pinnedRaw = query.get("pinned");
  if (pinnedRaw !== null && pinnedRaw !== "true" && pinnedRaw !== "false") invalid("pinned", "Pinned must be true or false.");
  const cursorRaw = query.get("cursor");
  return { status: status as "active" | "scheduled" | "archived", pinned: pinnedRaw === null ? null : pinnedRaw === "true", limit: parseLimit(query.get("limit")), cursor: cursorRaw ? decodeCursor(cursorRaw) : null };
}
