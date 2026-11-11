import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { editFoundPost, getFoundPost } from "@/src/server/modules/findit/service";

export async function GET(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest }) => {
    await requireAuth(apiRequest);
    return Response.json(await getFoundPost(id));
  })(request);
}

export async function PATCH(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest, body }) => {
    const user = await requireAuth(apiRequest);
    const contentType = apiRequest.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await apiRequest.formData();
      const input = Object.fromEntries([...form.keys()].filter((key) => key !== "images").map((key) => [key, form.get(key)]));
      return Response.json(await editFoundPost(id, input, form, user));
    }
    return Response.json(await editFoundPost(id, body, null, user));
  })(request);
}
