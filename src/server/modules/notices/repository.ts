import { prisma } from "@/src/lib/prisma";
import type { CursorPosition } from "@/src/lib/pagination";

const withPublisher = { publisher: { select: { emailId: true, name: true, dept: true, role: true } } };
export function createNotice(data: { id: string; title: string; body: string; pinned: boolean; publishAt: Date | null; sortAt: Date; publishedBy: string; attachment: { key: string; name: string; type: string; size: number } | null }) {
  return prisma.notice.create({ data: { id: data.id, title: data.title, body: data.body, pinned: data.pinned, publishAt: data.publishAt, sortAt: data.sortAt, publishedBy: data.publishedBy, ...(data.attachment ? { attachmentKey: data.attachment.key, attachmentName: data.attachment.name, attachmentType: data.attachment.type, attachmentSize: data.attachment.size } : {}) }, include: withPublisher });
}

export function listNotices(input: { status: "active" | "scheduled" | "archived"; pinned: boolean | null; limit: number; cursor: CursorPosition | null; now: Date; userId: string; role: string }) {
  const where = input.status === "active"
    ? { status: "active" as const, OR: [{ publishAt: null }, { publishAt: { lte: input.now } }] }
    : input.status === "scheduled"
      ? { status: "active" as const, publishAt: { gt: input.now } }
      : { status: "archived" as const };
  const scope = input.status !== "active" && input.role !== "admin" ? { publishedBy: input.userId } : {};
  return prisma.notice.findMany({
    where: { ...where, ...scope, ...(input.pinned === null ? {} : { pinned: input.pinned }), ...(input.cursor ? { AND: [{ OR: [{ sortAt: { lt: input.cursor.createdAt } }, { sortAt: input.cursor.createdAt, id: { lt: input.cursor.id } }] }] } : {}) },
    include: withPublisher, orderBy: [{ sortAt: "desc" }, { id: "desc" }], take: input.limit + 1,
  });
}

export function getNoticeAttachmentType(storageKey: string) {
  return prisma.notice.findFirst({ where: { attachmentKey: storageKey }, select: { attachmentType: true } });
}

export function findNotice(id: string) {
  return prisma.notice.findUnique({ where: { id }, include: withPublisher });
}

export function updateNotice(id: string, data: { title?: string; body?: string; pinned?: boolean; status?: "active" | "archived"; publishAt?: Date | null; sortAt?: Date; attachment?: { key: string; name: string; type: string; size: number } | null }) {
  return prisma.notice.update({ where: { id }, data: { ...data, ...(data.attachment === undefined ? {} : data.attachment ? { attachmentKey: data.attachment.key, attachmentName: data.attachment.name, attachmentType: data.attachment.type, attachmentSize: data.attachment.size } : { attachmentKey: null, attachmentName: null, attachmentType: null, attachmentSize: null }) }, include: withPublisher });
}

export function deleteNotice(id: string) { return prisma.notice.delete({ where: { id }, include: withPublisher }); }
