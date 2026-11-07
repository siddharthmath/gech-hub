# API contract

- **Success:** JSON body, status 200/201. Lists:
  `{ "items": [...], "count": n, "next_cursor": string | null }`, newest first.
  Cursor is opaque (base64 of `created_at|id`); `next_cursor: null` = last page.
  `?limit=` 1–100, default 25.
- **Error envelope (every failure, no exceptions):**
  `{ "error": { "code", "message", "details" }, "request_id" }`.
  Clients branch on `error.code`; `message` is user-displayable.
- **Error codes to implement as constants now:** INVALID_CREDENTIALS,
  UNKNOWN_INSTITUTION, USE_ADMIN_LOGIN, UNAUTHORIZED, INVALID_TOKEN,
  TOKEN_EXPIRED, FORBIDDEN, NOT_FOUND, ALREADY_EXISTS, VALIDATION_ERROR,
  EMAIL_DOMAIN_MISMATCH, FIELD_NOT_ALLOWED_FOR_ROLE, RATE_LIMITED, NETWORK.
  Feature codes (POST_NOT_ACTIVE, CLAIM_LOCKED, …) get added by their spec.
- **IDs:** the API creates all ids; prefix tells the type — FND- post, CLM-
  claim, LST- lost request, NTC- notice, DBT- doubt, DTY- doc type, DRQ-
  document request, ITY- issue type, TKT- ticket. Wrong-kind id → 422.
- **Auth:** `Authorization: Bearer <token>` on every endpoint except login and
  health. Token payload: `{ sub: email, role, teamId, dept? }`, expires 12h.
- **Dates/times:** store timestamps UTC; date-only fields (found_on, expected_by)
  are `YYYY-MM-DD` date columns.
- **Bodies:** JSON (`application/json`); file uploads later use
  `multipart/form-data`. JSON body limit 16KB.
