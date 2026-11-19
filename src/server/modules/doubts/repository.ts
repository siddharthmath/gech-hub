import { prisma } from "@/src/lib/prisma";
import type { CursorPosition } from "@/src/lib/pagination";

const doubtInclude = { asker: { select: { name: true, role: true } }, response: { include: { responder: { select: { name: true } } } } } as const;
export function createDoubt(data: { id: string; noticeId: string; askerId: string; question: string }) {
  return prisma.doubt.create({ data, include: doubtInclude });
}
export function listDoubts(input: { noticeId: string; answered: boolean | null; limit: number; cursor: CursorPosition | null }) {
  return prisma.doubt.findMany({ where: { noticeId: input.noticeId, ...(input.answered === null ? {} : input.answered ? { response: { isNot: null } } : { response: null }), ...(input.cursor ? { OR: [{ createdAt: { lt: input.cursor.createdAt } }, { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } }] } : {}) }, include: doubtInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: input.limit + 1 });
}
