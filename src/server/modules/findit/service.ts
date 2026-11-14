import { randomBytes } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { getPage } from "@/src/lib/pagination";
import { readSignedFile, storage } from "@/src/server/core/storage";
import { createFoundPost, deleteFoundPost as removeFoundPost, findFoundPostImage, getFoundPost as readFoundPost, listFoundPosts, updateFoundPost } from "@/src/server/modules/findit/repository";
import { foundPost } from "@/src/server/modules/findit/serializer";
import { parseCreatePost, parsePostListQuery, parsePostPatch } from "@/src/server/modules/findit/schemas";

export async function createPost(form: FormData, posterEmail: string) {
  const data = await parseCreatePost(form);
  const id = `FND-${randomBytes(4).toString("hex").toUpperCase()}`;
  const stored: Array<{ storageKey: string }> = [];
  try {
    for (const [position, image] of data.images.entries()) {
      const storageKey = `findit/${id}/${position}`;
      await storage.put(storageKey, image.bytes, image.contentType);
      stored.push({ storageKey });
    }
    const post = await createFoundPost({ ...data, id, postedBy: posterEmail, images: data.images.map((image, position) => ({ ...image, storageKey: stored[position].storageKey })) });
    return await foundPost(post);
  } catch (error) {
    await Promise.all(stored.map(({ storageKey }) => storage.remove(storageKey)));
    throw error;
  }
}

export async function getPosts(query: URLSearchParams) {
  const options = parsePostListQuery(query);
  const rows = await listFoundPosts(options);
  const page = getPage(rows, options.limit);
  return { items: await Promise.all(page.items.map(foundPost)), count: page.count, next_cursor: page.next_cursor };
}

export async function getPostImage(key: string, expires: string | null, signature: string | null) {
  const bytes = await readSignedFile(key, expires, signature);
  const image = await findFoundPostImage(key);
  if (!image) throw new ApiError(404, "NOT_FOUND", "File not found.");
  return { bytes, contentType: image.contentType };
}

function parseFoundPostId(id: string) {
  if (!/^FND-[A-F0-9]{8}$/.test(id)) throw new ApiError(422, "VALIDATION_ERROR", "Expected an FND id.", [{ field: "id", message: "Expected an FND id." }]);
  return id;
}

export async function getFoundPost(id: string) {
  const post = await readFoundPost(parseFoundPostId(id));
  if (!post) throw new ApiError(404, "NOT_FOUND", "Found post not found.");
  return foundPost(post);
}

export function assertCanManagePost(user: { role: string }, _post: { id: string }) {
  if (user.role !== "office_staff") throw new ApiError(403, "FORBIDDEN", "You do not have permission to manage this post.");
}

export async function deleteFoundPost(id: string, user: { role: string }) {
  if (user.role !== "office_staff") throw new ApiError(403, "FORBIDDEN", "You do not have permission to manage this post.");
  const postId = parseFoundPostId(id);
  const result = await removeFoundPost(postId);
  if (result.kind === "missing") throw new ApiError(404, "NOT_FOUND", "Found post not found.");
  if (result.kind === "pending_claims") {
    throw new ApiError(409, "POST_HAS_PENDING_CLAIMS", "A post with pending claims cannot be deleted.");
  }
  await Promise.all(result.images.map(async ({ storageKey }) => {
    try {
      await storage.remove(storageKey);
    } catch (error) {
      console.error("Failed to remove found post file after deletion.", { postId, storageKey, error });
    }
  }));
  return { deleted: true, id: postId };
}

export async function editFoundPost(id: string, input: unknown, form: FormData | null, user: { role: string }) {
  const postId = parseFoundPostId(id);
  const post = await readFoundPost(postId);
  if (!post) throw new ApiError(404, "NOT_FOUND", "Found post not found.");
  assertCanManagePost(user, post);
  const patch = await parsePostPatch(input, form);
  if (patch.status !== undefined && patch.status !== post.status && post.resolved) {
    throw new ApiError(409, "POST_RESOLVED", "A resolved post cannot change status until its resolution is undone.");
  }
  const replaceImages = patch.replaceImages || patch.removeImages;
  const staged: Array<{ storageKey: string }> = [];
  try {
    if (patch.replaceImages) {
      for (const [position, image] of patch.images.entries()) {
        const storageKey = `findit/${postId}/${randomBytes(8).toString("hex")}-${position}`;
        await storage.put(storageKey, image.bytes, image.contentType);
        staged.push({ storageKey });
      }
    }
    const updated = await updateFoundPost(postId, {
      title: patch.title,
      description: patch.description,
      locationFound: patch.locationFound,
      foundOn: patch.foundOn,
      status: patch.status,
      replaceImages,
      images: patch.images.map((image, position) => ({ ...image, storageKey: staged[position].storageKey })),
    });
    if (replaceImages) await Promise.all(post.images.map((image) => storage.remove(image.storageKey).catch(() => undefined)));
    return await foundPost(updated);
  } catch (error) {
    await Promise.all(staged.map(({ storageKey }) => storage.remove(storageKey).catch(() => undefined)));
    throw error;
  }
}
