import { randomBytes } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { getPage } from "@/src/lib/pagination";
import { readSignedFile, storage } from "@/src/server/core/storage";
import { createFoundPost, findFoundPostImage, listFoundPosts } from "@/src/server/modules/findit/repository";
import { foundPost } from "@/src/server/modules/findit/serializer";
import { parseCreatePost, parsePostListQuery } from "@/src/server/modules/findit/schemas";

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
