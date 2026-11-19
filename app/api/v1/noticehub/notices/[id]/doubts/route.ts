import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { askDoubt, browseDoubts } from "@/src/server/modules/doubts/service";

export const POST = withApi(async ({ request, body }) => {
  const user = await requireAuth(request, { roles: ["student", "faculty", "office_staff"] });
  const id = new URL(request.url).pathname.split("/").at(-2) ?? "";
  return Response.json(await askDoubt(id, body, user), { status: 201 });
});

export const GET = withApi(async ({ request, query }) => {
  const user = await requireAuth(request);
  const id = new URL(request.url).pathname.split("/").at(-2) ?? "";
  return Response.json(await browseDoubts(id, query, user));
});
