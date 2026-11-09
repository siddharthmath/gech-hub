import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { withdrawClaim } from "@/src/server/modules/findit/claims/service";

export async function DELETE(request: Request, context: RouteContext<"/api/v1/findit/claims/[id]">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest }) => {
    const user = await requireAuth(apiRequest);
    return Response.json(await withdrawClaim(id, user));
  })(request);
}
