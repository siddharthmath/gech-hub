import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { downloadNoticeAttachment } from "@/src/server/modules/notices/service";

export const GET = withApi(async ({ request }) => {
  const user = await requireAuth(request);
  const id = new URL(request.url).pathname.split("/").at(-2) ?? "";
  const file = await downloadNoticeAttachment(id, user);
  const safeName = file.fileName.replace(/[^\x20-\x7e]|[\r\n\u0000-\u001f\u007f"\\]/g, "_").trim() || "attachment";
  const encodedName = encodeURIComponent(file.fileName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(new Uint8Array(file.bytes), { headers: {
    "Content-Type": file.contentType,
    "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
    "Cache-Control": "private, no-store",
  } });
});
