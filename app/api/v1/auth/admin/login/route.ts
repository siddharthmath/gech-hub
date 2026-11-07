import { withApi } from "@/src/lib/http";
import { adminLoginSchema } from "@/src/server/modules/auth/schemas";
import { loginAdmin } from "@/src/server/modules/auth/service";

export const POST = withApi(async ({ body }) => {
  const input = adminLoginSchema.parse(body);
  return Response.json(await loginAdmin(input.email_id, input.otp));
});
