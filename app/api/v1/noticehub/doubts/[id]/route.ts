import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { editDoubt, removeDoubt } from "@/src/server/modules/doubts/service";

export const PATCH = withApi(async ({ request, body }) => {
  const user = await requireAuth(request);
  const id = new URL(request.url).pathname.split("/").at(-1) ?? "";
  return Response.json(await editDoubt(id, body, user));
});

export const DELETE = withApi(async ({ request }) => {
  const user = await requireAuth(request);
  const id = new URL(request.url).pathname.split("/").at(-1) ?? "";
  return Response.json(await removeDoubt(id, user));
});
