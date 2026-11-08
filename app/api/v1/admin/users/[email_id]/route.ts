import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { getCampusUser, updateCampusUser } from "@/src/server/modules/users/service";

type RouteContext = { params: Promise<{ email_id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return withApi(async () => {
    const admin = await requireAuth(request, { roles: ["admin"] });
    const { email_id: emailId } = await context.params;
    return Response.json(await getCampusUser(emailId, admin.teamId));
  })(request);
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(async ({ body }) => {
    const admin = await requireAuth(request, { roles: ["admin"] });
    const { email_id: emailId } = await context.params;
    return Response.json(await updateCampusUser(emailId, body, admin.teamId));
  })(request);
}
