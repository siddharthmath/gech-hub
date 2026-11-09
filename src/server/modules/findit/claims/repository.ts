import { prisma } from "@/src/lib/prisma";
import type { CursorPosition } from "@/src/lib/pagination";

export function getClaimablePost(id: string) {
  return prisma.foundPost.findUnique({ where: { id }, select: { id: true, title: true, status: true, resolved: true } });
}

export function createClaim(data: { id: string; postId: string; claimantId: string; message: string }) {
  return prisma.claim.create({
    data,
    include: { post: { select: { title: true } }, claimant: { select: { emailId: true, name: true, role: true, phoneNumber: true } } },
  });
}

export function listClaims(input: { postId?: string; claimantId?: string; limit: number; cursor: CursorPosition | null }) {
  return prisma.claim.findMany({
    where: {
      ...(input.postId ? { postId: input.postId } : {}),
      ...(input.claimantId ? { claimantId: input.claimantId } : {}),
      ...(input.cursor ? { OR: [{ createdAt: { lt: input.cursor.createdAt } }, { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } }] } : {}),
    },
    include: { post: { select: { title: true } }, claimant: { select: { emailId: true, name: true, role: true, phoneNumber: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: input.limit + 1,
  });
}

export function findClaimForClaimant(id: string, claimantId: string) {
  return prisma.claim.findFirst({ where: { id, claimantId }, select: { id: true, decision: true } });
}

export function deletePendingClaim(id: string, claimantId: string) {
  return prisma.claim.deleteMany({ where: { id, claimantId, decision: "pending" } });
}

export function getPostForClaims(id: string) {
  return prisma.foundPost.findUnique({ where: { id }, select: { id: true } });
}
