import { randomUUID } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { getPostImage } from "@/src/server/modules/findit/service";
import { getNoticeAttachment } from "@/src/server/modules/notices/service";

export async function GET(request: Request, context: RouteContext<"/api/files/[...key]">) {
  const requestId = randomUUID();
  try {
    const { key: parts } = await context.params;
    const key = parts.join("/");
    const params = new URL(request.url).searchParams;
    const image = key.startsWith("notices/")
      ? await getNoticeAttachment(key, params.get("expires"), params.get("signature"))
      : await getPostImage(key, params.get("expires"), params.get("signature"));
    return new Response(new Uint8Array(image.bytes), { headers: { "content-type": image.contentType, "cache-control": "private, no-store", "x-request-id": requestId } });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
    return Response.json({ error: { code: apiError.code, message: apiError.message, details: apiError.details }, request_id: requestId }, { status: apiError.status, headers: { "x-request-id": requestId } });
  }
}
