import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { createCampusUser, getCampusUsers } from "@/src/server/modules/users/service";

export const POST = withApi(async ({ request, body }) => {
  const admin = await requireAuth(request, { roles: ["admin"] });
  return Response.json(await createCampusUser(body, admin.teamId), { status: 201 });
});

export const GET = withApi(async ({ request, query }) => {
  const admin = await requireAuth(request, { roles: ["admin"] });
  return Response.json(await getCampusUsers(query, admin.teamId));
});
