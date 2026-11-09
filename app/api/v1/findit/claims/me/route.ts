import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { getMyClaims } from "@/src/server/modules/findit/claims/service";

export const GET = withApi(async ({ request, query }) => {
  const user = await requireAuth(request);
  return Response.json(await getMyClaims(query, user));
});
