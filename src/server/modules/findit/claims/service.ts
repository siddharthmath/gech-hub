import { randomBytes } from "node:crypto";
import { Prisma } from "@/src/generated/prisma/client";
import { ApiError } from "@/src/lib/errors";
import { getPage } from "@/src/lib/pagination";
import { createClaim, deletePendingClaim, findClaimForClaimant, getClaimablePost, getPostForClaims, listClaims } from "@/src/server/modules/findit/claims/repository";
import { claimObject } from "@/src/server/modules/findit/claims/serializer";
import { parseClaimListQuery, parseCreateClaim } from "@/src/server/modules/findit/claims/schemas";

function parsePostId(id: string) {
  if (!/^FND-[A-F0-9]{8}$/.test(id)) throw new ApiError(422, "VALIDATION_ERROR", "Expected an FND id.", [{ field: "id", message: "Expected an FND id." }]);
  return id;
}

export async function createPostClaim(id: string, input: unknown, user: { emailId: string }) {
  const postId = parsePostId(id);
  const { message } = parseCreateClaim(input);
  const post = await getClaimablePost(postId);
  if (!post) throw new ApiError(404, "NOT_FOUND", "Found post not found.");
  if (post.status !== "active" || post.resolved) throw new ApiError(409, "POST_NOT_ACTIVE", "Claims can only be made on active, unresolved posts.");
  try {
    const claim = await createClaim({ id: `CLM-${randomBytes(4).toString("hex").toUpperCase()}`, postId, claimantId: user.emailId, message });
    return claimObject(claim);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(409, "ALREADY_EXISTS", "You have already claimed this post.");
    throw error;
  }
}

export async function getPostClaims(id: string, query: URLSearchParams, user: { emailId: string; role: string }) {
  const postId = parsePostId(id);
  const options = parseClaimListQuery(query);
  if (!(await getPostForClaims(postId))) throw new ApiError(404, "NOT_FOUND", "Found post not found.");
  const rows = await listClaims({ postId, ...(user.role === "office_staff" ? {} : { claimantId: user.emailId }), ...options });
  const page = getPage(rows, options.limit);
  return { items: page.items.map(claimObject), count: page.count, next_cursor: page.next_cursor };
}

export async function getMyClaims(query: URLSearchParams, user: { emailId: string }) {
  const options = parseClaimListQuery(query);
  const rows = await listClaims({ claimantId: user.emailId, ...options });
  const page = getPage(rows, options.limit);
  return { items: page.items.map(claimObject), count: page.count, next_cursor: page.next_cursor };
}

export async function withdrawClaim(id: string, user: { emailId: string }) {
  if (!/^CLM-[A-F0-9]{8}$/.test(id)) throw new ApiError(422, "VALIDATION_ERROR", "Expected a CLM id.", [{ field: "id", message: "Expected a CLM id." }]);
  const deleted = await deletePendingClaim(id, user.emailId);
  if (deleted.count === 1) return { deleted: true, id };

  const claim = await findClaimForClaimant(id, user.emailId);
  if (!claim) throw new ApiError(404, "NOT_FOUND", "Claim not found.");
  throw new ApiError(409, "CLAIM_LOCKED", "Only pending claims can be withdrawn.");
}
