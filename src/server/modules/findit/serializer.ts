import { storage } from "@/src/server/core/storage";

export async function foundPost(post: { id: string; title: string; description: string | null; locationFound: string | null; foundOn: Date | null; status: "active" | "archived"; resolved: boolean; postedBy: string; createdAt: Date; updatedAt: Date; poster: { emailId: string; name: string; dept: string | null }; images: Array<{ storageKey: string }> }) {
  return {
    id: post.id, title: post.title, description: post.description, location_found: post.locationFound,
    found_on: post.foundOn?.toISOString().slice(0, 10) ?? null,
    images: await Promise.all(post.images.map(async (image) => ({ url: await storage.signedUrl(image.storageKey) }))),
    status: post.status, resolved: post.resolved,
    posted_by: { email_id: post.poster.emailId, name: post.poster.name, dept: post.poster.dept },
    created_at: post.createdAt.toISOString(), updated_at: post.updatedAt.toISOString(),
  };
}
