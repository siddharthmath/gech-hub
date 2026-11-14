import { withApi } from "@/src/lib/http";
import { requireAuth } from "@/src/server/core/auth";
import { changeResolution, createResolution, readResolution, undoResolution } from "@/src/server/modules/findit/resolutions/service";

export async function PATCH(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]/resolution">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest, body }) => {
    await requireAuth(apiRequest, { roles: ["office_staff"] });
    return Response.json(await changeResolution(id, body));
  })(request);
}

export async function DELETE(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]/resolution">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest }) => {
    await requireAuth(apiRequest, { roles: ["office_staff"] });
    return Response.json(await undoResolution(id));
  })(request);
}

export async function POST(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]/resolution">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest, body }) => {
    const user = await requireAuth(apiRequest, { roles: ["office_staff"] });
    return Response.json(await createResolution(id, body, user), { status: 201 });
  })(request);
}

export async function GET(request: Request, context: RouteContext<"/api/v1/findit/posts/[id]/resolution">) {
  const { id } = await context.params;
  return withApi(async ({ request: apiRequest }) => {
    const user = await requireAuth(apiRequest);
    return Response.json(await readResolution(id, user));
  })(request);
}
