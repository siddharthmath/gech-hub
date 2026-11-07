import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { ApiError } from "@/src/lib/errors";
import { withApi } from "@/src/lib/http";
import { callRoute } from "@/tests/helpers";
import { z } from "zod";

describe("API readiness", () => {
  it("returns a healthy status", async () => {
    const response = await GET(new Request("http://localhost/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
  });

  it("serializes ApiError in the standard envelope", async () => {
    const route = withApi(() => { throw new ApiError(403, "FORBIDDEN", "no"); });
    const result = await callRoute(route);
    expect(result.status).toBe(403);
    expect(result.json).toMatchObject({ error: { code: "FORBIDDEN", message: "no", details: null } });
    expect((result.json as { request_id?: string }).request_id).toBeTruthy();
  });

  it("returns 400 for malformed JSON", async () => {
    const route = withApi(() => Response.json({ status: "ok" }));
    const response = await route(new Request("http://localhost/api/test", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{invalid",
    }));
    expect(response.status).toBe(400);
    expect((await response.json() as { error: { message: string } }).error.message).toMatch(/malformed/i);
  });

  it("maps Zod failures to field details", async () => {
    const route = withApi(({ body }) => {
      z.object({ email: z.string().email() }).parse(body);
      return Response.json({ ok: true });
    });
    const result = await callRoute(route, { method: "POST", body: { email: "bad" } });
    expect(result.status).toBe(422);
    expect((result.json as { error: { details: Array<{ field: string }> } }).error.details[0].field).toBe("email");
  });
});
