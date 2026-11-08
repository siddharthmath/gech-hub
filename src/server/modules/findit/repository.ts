import { prisma } from "@/src/lib/prisma";
import type { CursorPosition } from "@/src/lib/pagination";
import type { UploadedImage } from "@/src/server/modules/findit/schemas";

const includePost = { poster: true, images: { orderBy: { position: "asc" as const } } };

export async function createFoundPost(data: { id: string; title: string; description: string | null; locationFound: string | null; foundOn: Date | null; postedBy: string; images: Array<UploadedImage & { storageKey: string }> }) {
  return prisma.foundPost.create({
    data: {
      id: data.id, title: data.title, description: data.description, locationFound: data.locationFound, foundOn: data.foundOn, postedBy: data.postedBy,
      images: { create: data.images.map((image, position) => ({ storageKey: image.storageKey, contentType: image.contentType, sizeBytes: image.bytes.byteLength, position })) },
    }, include: includePost,
  });
}

export function listFoundPosts(input: { status: "active" | "archived"; limit: number; cursor: CursorPosition | null }) {
  return prisma.foundPost.findMany({
    where: { status: input.status, ...(input.cursor ? { OR: [{ createdAt: { lt: input.cursor.createdAt } }, { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } }] } : {}) },
    include: includePost, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: input.limit + 1,
  });
}

export function findFoundPostImage(storageKey: string) {
  return prisma.foundPostImage.findFirst({ where: { storageKey }, select: { contentType: true } });
}
