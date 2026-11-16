import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { browseNotices, publishNotice } from "@/src/server/modules/notices/service";

export const POST = withApi(async ({ request }) => {
  const publisher = await requireAuth(request, { roles: ["admin", "faculty", "office_staff"] });
  return Response.json(await publishNotice(await request.formData(), publisher), { status: 201 });
});

export const GET = withApi(async ({ request, query }) => {
  const user = await requireAuth(request);
  return Response.json(await browseNotices(query, user));
});
