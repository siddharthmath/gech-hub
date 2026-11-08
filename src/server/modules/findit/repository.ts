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

export function getFoundPost(id: string) {
  return prisma.foundPost.findUnique({ where: { id }, include: includePost });
}

export async function updateFoundPost(id: string, input: {
  title?: string; description?: string | null; locationFound?: string | null; foundOn?: Date;
  status?: "active" | "archived"; replaceImages: boolean; images: Array<UploadedImage & { storageKey: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.replaceImages) {
      await tx.foundPostImage.deleteMany({ where: { postId: id } });
      if (input.images.length) await tx.foundPostImage.createMany({ data: input.images.map((image, position) => ({ postId: id, storageKey: image.storageKey, contentType: image.contentType, sizeBytes: image.bytes.byteLength, position })) });
    }
    return tx.foundPost.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.locationFound !== undefined ? { locationFound: input.locationFound } : {}),
        ...(input.foundOn !== undefined ? { foundOn: input.foundOn } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: includePost,
    });
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
