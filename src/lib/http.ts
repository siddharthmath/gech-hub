import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { ApiError } from "@/src/lib/errors";

export type ApiContext = {
  request: Request;
  requestId: string;
  body: unknown;
  query: URLSearchParams;
};

export type ApiHandler = (context: ApiContext) => Response | Promise<Response>;

function json(status: number, payload: unknown, requestId: string): Response {
  const body =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? { ...payload, request_id: requestId }
      : payload;
  return Response.json(body, { status, headers: { "x-request-id": requestId } });
}

export function withApi(handler: ApiHandler) {
  return async (request: Request): Promise<Response> => {
    const requestId = randomUUID();
    let body: unknown = undefined;

    if (request.method !== "GET" && request.method !== "HEAD") {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 16 * 1024) {
          return json(413, {
            error: { code: "PAYLOAD_TOO_LARGE", message: "JSON request bodies must not exceed 16KB.", details: null },
          }, requestId);
        }
        try {
          const rawBody = await request.text();
          if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) {
            return json(413, {
              error: { code: "PAYLOAD_TOO_LARGE", message: "JSON request bodies must not exceed 16KB.", details: null },
            }, requestId);
          }
          body = rawBody.length ? JSON.parse(rawBody) as unknown : undefined;
        } catch {
          return json(400, {
            error: { code: "INVALID_JSON", message: "Request body contains malformed JSON.", details: null },
          }, requestId);
        }
      }
    }

    try {
      const response = await handler({
        request,
        requestId,
        body,
        query: new URL(request.url).searchParams,
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        if (typeof payload === "object" && payload !== null && "error" in payload) {
          return json(response.status, payload, requestId);
        }
        return json(response.status, {
          error: { code: "HTTP_ERROR", message: "The request could not be completed.", details: null },
        }, requestId);
      }
      const payload: unknown = await response.json();
      return Response.json(payload, { status: response.status, headers: { "x-request-id": requestId } });
    } catch (error) {
      if (error instanceof ZodError) {
        return json(422, {
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed.",
            details: error.issues.map((issue) => ({
              field: issue.path.map(String).join("."),
              message: issue.message,
            })),
          },
        }, requestId);
      }

      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");

      return json(apiError.status, {
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details,
        },
      }, requestId);
    }
  };
}
