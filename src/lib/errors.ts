export const API_ERROR_CODES = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNKNOWN_INSTITUTION: "UNKNOWN_INSTITUTION",
  USE_ADMIN_LOGIN: "USE_ADMIN_LOGIN",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EMAIL_DOMAIN_MISMATCH: "EMAIL_DOMAIN_MISMATCH",
  FIELD_NOT_ALLOWED_FOR_ROLE: "FIELD_NOT_ALLOWED_FOR_ROLE",
  RATE_LIMITED: "RATE_LIMITED",
  NETWORK: "NETWORK",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
export type ErrorDetails = Array<{ field: string; message: string }> | unknown;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ErrorDetails = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
