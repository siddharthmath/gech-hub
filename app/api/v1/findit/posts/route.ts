import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { createPost, getPosts } from "@/src/server/modules/findit/service";

export const POST = withApi(async ({ request }) => {
  const staff = await requireAuth(request, { roles: ["office_staff"] });
  const form = await request.formData();
  return Response.json(await createPost(form, staff.emailId), { status: 201 });
});

export const GET = withApi(async ({ request, query }) => {
  await requireAuth(request);
  return Response.json(await getPosts(query));
});
