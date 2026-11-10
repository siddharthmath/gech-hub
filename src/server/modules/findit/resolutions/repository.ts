import { prisma } from "@/src/lib/prisma";

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
