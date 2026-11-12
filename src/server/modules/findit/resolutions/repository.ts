import { prisma } from "@/src/lib/prisma";

const postInclude = { poster: true, images: { orderBy: { position: "asc" as const } } };

const resolutionInclude = {
  claim: { include: { claimant: { select: { emailId: true, name: true, role: true, phoneNumber: true } } } },
  resolver: { select: { emailId: true, name: true } },
} as const;

export async function resolvePost(input: { postId: string; claimId: string; note: string | null; resolvedBy: string }) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.foundPost.findUnique({ where: { id: input.postId }, select: { id: true, status: true, resolved: true } });
    if (!post) return { kind: "post_missing" as const };
    if (post.resolved) return { kind: "already_resolved" as const };
    if (post.status === "archived") return { kind: "not_active" as const };
    const claim = await tx.claim.findUnique({ where: { id: input.claimId }, select: { id: true, postId: true, decision: true } });
    if (!claim || claim.postId !== input.postId) return { kind: "claim_missing" as const };
    if (claim.decision !== "pending") return { kind: "claim_locked" as const };

    const created = await tx.resolution.create({
      data: { postId: input.postId, claimId: input.claimId, note: input.note, resolvedBy: input.resolvedBy },
    });
    await tx.foundPost.update({ where: { id: input.postId }, data: { resolved: true, status: "archived" } });
    await tx.claim.updateMany({ where: { postId: input.postId, id: input.claimId }, data: { decision: "approved" } });
    await tx.claim.updateMany({ where: { postId: input.postId, id: { not: input.claimId } }, data: { decision: "rejected" } });
    return { kind: "created" as const, resolution: await tx.resolution.findUniqueOrThrow({ where: { postId: created.postId }, include: resolutionInclude }) };
  });
}

export function getResolution(postId: string) {
  return prisma.resolution.findUnique({ where: { postId }, include: resolutionInclude });
}

export async function changeResolution(input: { postId: string; claimId?: string; note?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const resolution = await tx.resolution.findUnique({ where: { postId: input.postId }, select: { claimId: true } });
    if (!resolution) return { kind: "resolution_missing" as const };

    let claimId = resolution.claimId;
    if (input.claimId !== undefined && input.claimId !== resolution.claimId) {
      const nextClaim = await tx.claim.findFirst({ where: { id: input.claimId, postId: input.postId }, select: { id: true } });
      if (!nextClaim) return { kind: "claim_missing" as const };
      await tx.claim.update({ where: { id: resolution.claimId }, data: { decision: "rejected" } });
      await tx.claim.update({ where: { id: nextClaim.id }, data: { decision: "approved" } });
      claimId = nextClaim.id;
    }
    await tx.resolution.update({ where: { postId: input.postId }, data: { claimId, ...(input.note !== undefined ? { note: input.note } : {}) } });
    return { kind: "updated" as const, resolution: await tx.resolution.findUniqueOrThrow({ where: { postId: input.postId }, include: resolutionInclude }) };
  });
}

export async function undoResolution(postId: string) {
  return prisma.$transaction(async (tx) => {
    const resolution = await tx.resolution.findUnique({ where: { postId }, select: { postId: true } });
    if (!resolution) return { kind: "resolution_missing" as const };
    await tx.resolution.delete({ where: { postId } });
    await tx.foundPost.update({ where: { id: postId }, data: { resolved: false, status: "active" } });
    await tx.claim.updateMany({ where: { postId }, data: { decision: "pending" } });
    const post = await tx.foundPost.findUniqueOrThrow({ where: { id: postId }, include: postInclude });
    return { kind: "undone" as const, post };
  });
}
