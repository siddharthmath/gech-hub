import { randomBytes } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { getPage } from "@/src/lib/pagination";
import { findNotice } from "@/src/server/modules/notices/repository";
import { createDoubt, deleteDoubt, findDoubt, listDoubts, updateDoubtQuestion } from "./repository";
import { serializeDoubt } from "./serializer";
import { parseDoubtId, parseDoubtQuery, parseQuestion } from "./schemas";

async function visibleNotice(id: string, user: { emailId: string; role: string }) {
  if (!id.startsWith("NTC-")) throw new ApiError(422, "VALIDATION_ERROR", "Request validation failed.", [{ field: "id", message: "ID must be an NTC notice ID." }]);
  const notice = await findNotice(id);
  const now = new Date();
  if (!notice) throw new ApiError(404, "NOT_FOUND", "Notice not found.");
  const scheduled = notice.status === "active" && notice.publishAt !== null && notice.publishAt > now;
  if ((scheduled || notice.status === "archived") && notice.publishedBy !== user.emailId && user.role !== "admin") throw new ApiError(404, "NOT_FOUND", "Notice not found.");
  return { notice, now };
}

export async function askDoubt(id: string, body: unknown, user: { emailId: string; role: string }) {
  if (user.role === "admin") throw new ApiError(403, "FORBIDDEN", "Admins cannot ask doubts.");
  const question = parseQuestion(body);
  const { notice, now } = await visibleNotice(id, user);
  const scheduled = notice.status === "active" && notice.publishAt !== null && notice.publishAt > now;
  if (notice.status === "archived" || scheduled) throw new ApiError(409, "NOTICE_NOT_ACTIVE", "Doubts are closed for this notice.");
  const row = await createDoubt({ id: `DBT-${randomBytes(4).toString("hex").toUpperCase()}`, noticeId: id, askerId: user.emailId, question });
  return serializeDoubt(row, user.emailId);
}

export async function browseDoubts(id: string, query: URLSearchParams, user: { emailId: string; role: string }) {
  await visibleNotice(id, user);
  const options = parseDoubtQuery(query);
  const rows = await listDoubts({ noticeId: id, ...options });
  const page = getPage(rows, options.limit);
  return { items: page.items.map((row) => serializeDoubt(row, user.emailId)), count: page.count, next_cursor: page.next_cursor };
}

async function ownedDoubt(id: string, user: { emailId: string; role: string }) {
  if (user.role === "admin") throw new ApiError(403, "FORBIDDEN", "Admins cannot edit or delete doubts.");
  const doubtId = parseDoubtId(id);
  const row = await findDoubt(doubtId);
  if (!row || row.askerId.toLowerCase() !== user.emailId.toLowerCase()) throw new ApiError(404, "NOT_FOUND", "Doubt not found.");
  await visibleNotice(row.noticeId, user);
  return row;
}

export async function editDoubt(id: string, body: unknown, user: { emailId: string; role: string }) {
  const question = parseQuestion(body);
  const doubt = await ownedDoubt(id, user);
  if (doubt.response) throw new ApiError(409, "DOUBT_ANSWERED", "Answered doubts cannot be edited.");
  const update = await updateDoubtQuestion(doubt.id, question);
  if (!update.count) {
    const current = await findDoubt(doubt.id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "Doubt not found.");
    throw new ApiError(409, "DOUBT_ANSWERED", "Answered doubts cannot be edited.");
  }
  const row = await findDoubt(doubt.id);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Doubt not found.");
  return serializeDoubt(row, user.emailId);
}

export async function removeDoubt(id: string, user: { emailId: string; role: string }) {
  const doubt = await ownedDoubt(id, user);
  await deleteDoubt(doubt.id);
  return { deleted: true as const, id: doubt.id };
}
