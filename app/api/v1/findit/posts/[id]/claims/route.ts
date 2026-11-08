import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { createPostClaim, getPostClaims } from "@/src/server/modules/findit/claims/service";

export async function POST(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]/claims">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest, body }) => {
    const user = await requireAuth(apiRequest);
    return Response.json(await createPostClaim(id, body, user), { status: 201 });
  })(request);
}

export async function GET(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]/claims">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest, query }) => {
    const user = await requireAuth(apiRequest);
    return Response.json(await getPostClaims(id, query, user));
  })(request);
}
