import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { regenerateCampusUserOtp } from "@/src/server/modules/users/service";

type RouteContext = { params: Promise<{ email_id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withApi(async () => {
    const admin = await requireAuth(request, { roles: ["admin"] });
    const { email_id: emailId } = await context.params;
    return Response.json(await regenerateCampusUserOtp(emailId, admin.teamId));
  })(request);
}
