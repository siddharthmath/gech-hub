import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { getUserProfile } from "@/src/server/modules/users/service";

export const GET = withApi(async ({ request }) => {
  const user = await requireAuth(request, { roles: ["student", "faculty", "office_staff"] });
  return Response.json(await getUserProfile(user.emailId));
});
