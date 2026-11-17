import { randomBytes } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { getPage } from "@/src/lib/pagination";
import { readSignedFile, readStoredFile, storage } from "@/src/server/core/storage";
import { createNotice, deleteNotice, findNotice, listNotices, updateNotice } from "@/src/server/modules/notices/repository";
import { notice } from "@/src/server/modules/notices/serializer";
import { parseCreateNotice, parseNoticeListQuery, parseUpdateNotice } from "@/src/server/modules/notices/schemas";

export async function publishNotice(form: FormData, publisher: { emailId: string; role: string }) {
  if (!["admin", "faculty", "office_staff"].includes(publisher.role)) throw new ApiError(403, "FORBIDDEN", "Students cannot publish notices.");
  const data = await parseCreateNotice(form);
  const now = new Date(); const id = `NTC-${randomBytes(4).toString("hex").toUpperCase()}`;
  const key = data.attachment ? `notices/${id}/${randomBytes(8).toString("hex")}` : null;
  if (data.attachment && key) await storage.put(key, data.attachment.bytes, data.attachment.contentType);
  try {
    const saved = await createNotice({ id, title: data.title, body: data.body, pinned: data.pinned, publishAt: data.publishAt, sortAt: data.publishAt ?? now, publishedBy: publisher.emailId, attachment: data.attachment && key ? { key, name: data.attachment.file.name, type: data.attachment.contentType, size: data.attachment.file.size } : null });
    return await notice(saved, now);
  } catch (error) {
    if (key) await storage.remove(key).catch(() => undefined);
    throw error;
  }
}

export async function browseNotices(query: URLSearchParams, user: { emailId: string; role: string }) {
  const options = parseNoticeListQuery(query); const now = new Date();
  const rows = await listNotices({ ...options, now, userId: user.emailId, role: user.role });
  const page = getPage(rows.map((item) => ({ ...item, createdAt: item.sortAt })), options.limit);
  return { items: await Promise.all(page.items.map((item) => notice(item, now))), count: page.count, next_cursor: page.next_cursor };
}

function validateNoticeId(id: string) {
  if (!id.startsWith("NTC-")) throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "id", message: "ID must be an NTC notice ID." }]);
}

async function visibleNotice(id: string, user: { emailId: string; role: string }) {
  validateNoticeId(id);
  const item = await findNotice(id);
  const now = new Date();
  if (!item) throw new ApiError(404, "NOT_FOUND", "Notice not found.");
  const scheduled = item.status === "active" && item.publishAt !== null && item.publishAt > now;
  if ((scheduled || item.status === "archived") && item.publishedBy !== user.emailId && user.role !== "admin") {
    throw new ApiError(404, "NOT_FOUND", "Notice not found.");
  }
  return { item, now };
}

export async function readNotice(id: string, user: { emailId: string; role: string }) {
  const { item, now } = await visibleNotice(id, user);
  return notice(item, now);
}

export async function downloadNoticeAttachment(id: string, user: { emailId: string; role: string }) {
  const { item } = await visibleNotice(id, user);
  if (!item.attachmentKey || !item.attachmentName || !item.attachmentType) throw new ApiError(404, "NOT_FOUND", "Notice attachment not found.");
  return { bytes: await readStoredFile(item.attachmentKey), contentType: item.attachmentType, fileName: item.attachmentName };
}

export async function getNoticeAttachment(key: string, expires: string | null, signature: string | null) {
  const match = /^notices\/(NTC-[A-F0-9]{8})\/[a-f0-9]{16}$/.exec(key);
  if (!match) throw new ApiError(404, "NOT_FOUND", "File not found.");
  const item = await findNotice(match[1]);
  if (!item || item.attachmentKey !== key || !item.attachmentType) throw new ApiError(404, "NOT_FOUND", "File not found.");
  return { bytes: await readSignedFile(key, expires, signature), contentType: item.attachmentType };
}

export async function editNotice(id: string, request: Request, parsedBody: unknown, user: { emailId: string; role: string }) {
  if (user.role === "student") throw new ApiError(403, "FORBIDDEN", "Students cannot edit notices.");
  validateNoticeId(id);
  const current = await findNotice(id);
  if (!current || current.publishedBy !== user.emailId) throw new ApiError(404, "NOT_FOUND", "Notice not found.");
  const data = await parseUpdateNotice(request, parsedBody);
  const now = new Date();
  if (data.publishAt !== undefined && current.status === "active" && !(current.publishAt && current.publishAt > now)) throw new ApiError(409, "NOTICE_ALREADY_PUBLISHED", "This notice has already been published.");
  const key = data.attachment ? `notices/${id}/${randomBytes(8).toString("hex")}` : null;
  if (data.attachment && key) await storage.put(key, data.attachment.bytes, data.attachment.contentType);
  const oldKey = current.attachmentKey;
  const attachment = key && data.attachment ? { key, name: data.attachment.file.name, type: data.attachment.contentType, size: data.attachment.file.size } : data.removeAttachment ? null : undefined;
  try {
    const saved = await updateNotice(id, { ...(data.title === undefined ? {} : { title: data.title }), ...(data.body === undefined ? {} : { body: data.body }), ...(data.pinned === undefined ? {} : { pinned: data.pinned }), ...(data.status === undefined ? {} : { status: data.status }), ...(data.publishAt === undefined ? {} : { publishAt: data.publishAt, sortAt: data.publishAt ?? now }), ...(attachment === undefined ? {} : { attachment }) });
    if ((key || data.removeAttachment) && oldKey) await storage.remove(oldKey).catch((error) => console.error("Notice attachment cleanup failed", error));
    return await notice(saved, now);
  } catch (error) {
    if (key) await storage.remove(key).catch(() => undefined);
    throw error;
  }
}

export async function removeNotice(id: string, user: { emailId: string; role: string }) {
  if (user.role === "student") throw new ApiError(403, "FORBIDDEN", "Students cannot delete notices.");
  validateNoticeId(id);
  const current = await findNotice(id);
  if (!current || user.role !== "admin" && current.publishedBy !== user.emailId) throw new ApiError(404, "NOT_FOUND", "Notice not found.");
  await deleteNotice(id);
  if (current.attachmentKey) await storage.remove(current.attachmentKey).catch((error) => console.error("Notice attachment cleanup failed", error));
  return { deleted: true, id };
}
