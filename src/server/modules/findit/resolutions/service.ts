import { ApiError } from "@/src/lib/errors";
import { changeResolution as changeResolutionRecord, getResolution, resolvePost, undoResolution as undoResolutionRecord } from "@/src/server/modules/findit/resolutions/repository";
import { resolutionObject } from "@/src/server/modules/findit/resolutions/serializer";
import { foundPost } from "@/src/server/modules/findit/serializer";
import { parseResolutionInput, parseResolutionPatch, parseResolutionPostId } from "@/src/server/modules/findit/resolutions/schemas";

export async function createResolution(postIdInput: string, input: unknown, user: { emailId: string }) {
  const postId = parseResolutionPostId(postIdInput);
  const parsed = parseResolutionInput(input);
  const result = await resolvePost({ ...parsed, postId, resolvedBy: user.emailId });
  if (result.kind === "post_missing") throw new ApiError(404, "NOT_FOUND", "Found post not found.");
  if (result.kind === "already_resolved") throw new ApiError(409, "POST_RESOLVED", "Found post is already resolved.");
  if (result.kind === "not_active") throw new ApiError(409, "POST_NOT_ACTIVE", "Archived posts cannot be resolved.");
  if (result.kind === "claim_missing") throw new ApiError(404, "NOT_FOUND", "Claim not found for this post.");
  if (result.kind === "claim_locked") throw new ApiError(409, "CLAIM_LOCKED", "Only pending claims can be approved.");
  return resolutionObject(result.resolution);
}

export async function readResolution(postIdInput: string, user: { emailId: string; role: string }) {
  const postId = parseResolutionPostId(postIdInput);
  const resolution = await getResolution(postId);
  if (!resolution || (user.role !== "office_staff" && resolution.claim.claimantId !== user.emailId)) {
    throw new ApiError(404, "NOT_FOUND", "Resolution not found.");
  }
  return resolutionObject(resolution);
}

export async function changeResolution(postIdInput: string, input: unknown) {
  const postId = parseResolutionPostId(postIdInput);
  const parsed = parseResolutionPatch(input);
  const result = await changeResolutionRecord({ ...parsed, postId });
  if (result.kind === "resolution_missing") throw new ApiError(404, "NOT_FOUND", "Resolution not found.");
  if (result.kind === "claim_missing") throw new ApiError(404, "NOT_FOUND", "Claim not found for this post.");
  return resolutionObject(result.resolution);
}

export async function undoResolution(postIdInput: string) {
  const postId = parseResolutionPostId(postIdInput);
  const result = await undoResolutionRecord(postId);
  if (result.kind === "resolution_missing") throw new ApiError(404, "NOT_FOUND", "Resolution not found.");
  return foundPost(result.post);
}
