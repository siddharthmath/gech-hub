import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { createLostRequest, getLostRequests } from "@/src/server/modules/lost-requests/service";

const allowedRoles = ["student", "faculty", "office_staff"];

export const POST = withApi(async ({ request, body }) => {
  const user = await requireAuth(request, { roles: allowedRoles });
  return Response.json(await createLostRequest(body, user.emailId), { status: 201 });
});

export const GET = withApi(async ({ request, query }) => {
  const user = await requireAuth(request, { roles: allowedRoles });
  return Response.json(await getLostRequests(query, user));
});
