import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { readNotice } from "@/src/server/modules/notices/service";

export const GET = withApi(async ({ request }) => {
  const user = await requireAuth(request);
  const id = new URL(request.url).pathname.split("/").at(-1) ?? "";
  return Response.json(await readNotice(id, user));
});
