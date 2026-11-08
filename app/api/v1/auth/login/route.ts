import { withApi } from "@/src/lib/http";
import { userLoginSchema } from "@/src/server/modules/auth/schemas";
import { loginUser } from "@/src/server/modules/auth/service";

export const POST = withApi(async ({ body }) => {
  const input = userLoginSchema.parse(body);
  return Response.json(await loginUser(input.email_id, input.otp));
});
