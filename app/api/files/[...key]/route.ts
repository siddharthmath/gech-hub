import { randomUUID } from "node:crypto";
import { ApiError } from "@/src/lib/errors";
import { getPostImage } from "@/src/server/modules/findit/service";

export async function GET(request: Request, context: RouteContext<"/api/files/[...key]">) {
  const requestId = randomUUID();
  try {
    const { key: parts } = await context.params;
    const key = parts.join("/");
    const image = await getPostImage(key, new URL(request.url).searchParams.get("expires"), new URL(request.url).searchParams.get("signature"));
    return new Response(new Uint8Array(image.bytes), { headers: { "content-type": image.contentType, "cache-control": "private, no-store", "x-request-id": requestId } });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
    return Response.json({ error: { code: apiError.code, message: apiError.message, details: apiError.details }, request_id: requestId }, { status: apiError.status, headers: { "x-request-id": requestId } });
  }
}
