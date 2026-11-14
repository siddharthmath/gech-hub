import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { editLostRequest, removeLostRequest } from "@/src/server/modules/lost-requests/service";

const allowedRoles = ["student", "faculty", "office_staff"];

export async function PATCH(request: Request, context: RouteContext<"/api/v1/findit/lost-requests/[id]">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest, body }) => {
    const user = await requireAuth(apiRequest, { roles: allowedRoles });
    return Response.json(await editLostRequest(id, body, user.emailId));
  })(request);
}

export async function DELETE(request: Request, context: RouteContext<"/api/v1/findit/lost-requests/[id]">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest }) => {
    const user = await requireAuth(apiRequest, { roles: allowedRoles });
    return Response.json(await removeLostRequest(id, user.emailId));
  })(request);
}
