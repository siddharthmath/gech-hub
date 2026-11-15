import { storage } from "@/src/server/core/storage";

export async function notice(item: { id: string; title: string; body: string; pinned: boolean; status: "active" | "archived"; publishAt: Date | null; sortAt: Date; attachmentKey: string | null; attachmentName: string | null; attachmentType: string | null; attachmentSize: number | null; publishedBy: string; createdAt: Date; updatedAt: Date; publisher: { emailId: string; name: string; dept: string | null } }, now = new Date()) {
  const scheduled = item.status === "active" && item.publishAt !== null && item.publishAt.getTime() > now.getTime();
  return {
    id: item.id, title: item.title, body: item.body, pinned: item.pinned, status: scheduled ? "scheduled" : item.status,
    publish_at: item.publishAt?.toISOString() ?? null, sort_at: item.sortAt.toISOString(),
    attachment: item.attachmentKey && item.attachmentName ? { file_name: item.attachmentName, content_type: item.attachmentType, size: item.attachmentSize, url: await storage.signedUrl(item.attachmentKey) } : null,
    published_by: { email_id: item.publisher.emailId, name: item.publisher.name, dept: item.publisher.dept },
    created_at: item.createdAt.toISOString(), updated_at: item.updatedAt.toISOString(),
  };
}
