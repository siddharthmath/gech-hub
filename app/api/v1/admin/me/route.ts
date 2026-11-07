import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { adminProfile } from "@/src/server/modules/auth/serializer";

export const GET = withApi(async ({ request }) => {
  const user = await requireAuth(request, { roles: ["admin"] });
  return Response.json(adminProfile(user));
});
