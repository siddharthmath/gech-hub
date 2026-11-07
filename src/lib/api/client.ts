import { useSessionStore } from "@/src/store/session";
import { useAdminSessionStore } from "@/src/store/admin-session";
import { ApiError } from "./errors";

export type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiCallOptions {
  body?: unknown;
  formData?: FormData;
  headers?: HeadersInit;
  authScope?: "user" | "admin";
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "";

export async function apiCall<T>(
  method: ApiMethod,
  path: string,
  opts: ApiCallOptions = {},
): Promise<T> {
  const isLogin =
    path === "/api/v1/auth/login" || path === "/api/v1/auth/admin/login";
  const authScope = opts.authScope ?? "user";
  const token = authScope === "admin"
    ? useAdminSessionStore.getState().token
    : useSessionStore.getState().token;
  const headers = new Headers(opts.headers);

  if (!isLogin && token) headers.set("Authorization", `Bearer ${token}`);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body:
        opts.formData ??
        (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    });
  } catch {
    throw new ApiError({ code: "NETWORK", message: "Network request failed." });
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const envelope = isRecord(payload) ? payload : {};
    const error = isRecord(envelope.error) ? envelope.error : {};
    const apiError = new ApiError({
      code: stringOr(error.code, "UNKNOWN_ERROR"),
      message: stringOr(error.message, "The request could not be completed."),
      ...(error.details === undefined ? {} : { details: error.details }),
      ...(stringOr(envelope.request_id, "")
        ? { request_id: stringOr(envelope.request_id, "") }
        : {}),
    });

    if (
      response.status === 401 &&
      (apiError.code === "TOKEN_EXPIRED" || apiError.code === "UNAUTHORIZED")
    ) {
      if (authScope === "admin") {
        useAdminSessionStore.getState().logout();
      } else {
        useSessionStore.getState().logout();
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gechhub:session-expired", {
          detail: { scope: authScope },
        }));
      }
    }
    throw apiError;
  }

  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
