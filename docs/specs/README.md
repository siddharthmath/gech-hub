# GECHhub backend specs: index

Backend built **inside the frontend's Next.js project** (`app/api/v1/`, Prisma +
PostgreSQL). Contract: the API Quick Guide. Paths, methods, roles and field
names are fixed; nothing outside the guide is added.
Rule: **one goal and 2 endpoints per spec, each with tests.** One spec at a
time, in order, then stop. All paths below are under `/api/v1`.

| Spec | Goal | Endpoints |
|---|---|---|
| 00 | Project readiness | `GET /api/health` |
| 10 | Admin sign-in | `POST /auth/admin/login` · `GET /admin/me` |
| 11 | Create and list users | `POST` · `GET /admin/users` |
| 12 | View and edit a user | `GET` · `PATCH /admin/users/{email_id}` |
| 13 | Remove user, reissue OTP | `DELETE /admin/users/{email_id}` · `POST .../regenerate-otp` |
| 14 | User sign-in | `POST /auth/login` · `GET /users/me` |
| 15 | Post and browse found items | `POST` · `GET /findit/posts` |
| 16 | View and edit a found item | `GET` · `PATCH /findit/posts/{id}` |
| 17 | Claim an item | `POST` · `GET /findit/posts/{id}/claims` |
| 18 | My claims, withdraw | `GET /findit/claims/me` · `DELETE /findit/claims/{id}` |
| 19 | Resolve a post | `POST` · `GET /findit/posts/{id}/resolution` |
| 20 | Change or undo resolution | `PATCH` · `DELETE /findit/posts/{id}/resolution` |
| 21 | Delete a found item | `DELETE /findit/posts/{id}` (one endpoint, heaviest rules) |
| 22 | Report and list lost items | `POST` · `GET /findit/lost-requests` |
| 23 | Edit, archive, delete lost item | `PATCH` · `DELETE /findit/lost-requests/{id}` |

Specs 10–20 cover admin, authentication and claims/resolution; 21–23 finish
FindIt. Stop at 20 if you want only that range.

## Contract recap (every spec)

- **Success:** 200/201. Lists `{ items, count, next_cursor }`, newest first;
  `count` = items on this page; `?limit=` 1–100, default 25; cursor = base64 of
  `created_at|id`, `null` = last page.
- **Errors:** `{ error: { code, message, details }, request_id }`; `details` is
  `[{ field, message }]` for validation, else `null`.
- **Status map:** INVALID_CREDENTIALS 401 · UNKNOWN_INSTITUTION 400 ·
  USE_ADMIN_LOGIN 403 · UNAUTHORIZED 401 · INVALID_TOKEN 401 · TOKEN_EXPIRED 401 ·
  FORBIDDEN 403 · NOT_FOUND 404 · ALREADY_EXISTS 409 · VALIDATION_ERROR 422 ·
  EMAIL_DOMAIN_MISMATCH 422 · FIELD_NOT_ALLOWED_FOR_ROLE 422 · RATE_LIMITED 429.
  Feature codes (POST_NOT_ACTIVE, CLAIM_LOCKED, …) are added by the spec that
  first uses them.
- **404 = not found or not yours** for owner-scoped records.
- **IDs:** `FND-` post, `CLM-` claim, `LST-` lost request; `PREFIX-` + 8
  uppercase hex. Wrong-kind id → 422 VALIDATION_ERROR.
- **Auth:** `Authorization: Bearer <jwt>`, HS256, 12h, payload
  `{ sub, role, teamId, dept? }`; the guard re-reads the user from the DB.
- **Dates:** `YYYY-MM-DD` for date-only fields; UTC ISO timestamps.
- **Bodies:** JSON ≤ 16KB; files are `multipart/form-data`. PATCH changes only
  the fields sent.

## Test conventions (every spec)

- Vitest; call route handlers with `new Request(...)` on `DATABASE_URL_TEST`;
  truncate tables before each test.
- Shared helpers in `tests/factories.ts` (`makeAdmin`, `makeUser`, `makeStaff`,
  `makePost`, `makeClaim`, `tokenFor`); extend, never duplicate.
- Each endpoint: happy path, auth failure, wrong role, validation failure, and
  every error code its spec lists. Assert status + `error.code`, not message text.
- Done = `pnpm types && pnpm lint && pnpm test && pnpm build` pass.

## Choices made where the guide is silent

Each lives in one module, so a fix is local. Check against `{baseUrl}/docs`.

- Limits not in the guide: description ≤ 2000, OTP = 6 digits, lockout = 5
  failures / 15 min.
- Claim, LostRequest, Resolution, image and user object shapes are inferred from
  the frontend specs.
- `GET /findit/posts/{id}/resolution` is not in the Quick Guide table but the
  frontend calls it, so it is included.
- Any office staff may manage any found post (`assertCanManagePost`).
- Status codes for USE_ADMIN_LOGIN (403) and malformed JSON (400).

## Environment (set up in spec 00)

`DATABASE_URL`, `DATABASE_URL_TEST`, `JWT_SECRET` (≥ 32 chars), `TEAM_ID`,
`TEAM_EMAIL_DOMAIN` (e.g. `team1.com`), `ADMIN_EMAIL_ID`, `ADMIN_OTP`,
`ADMIN_NAME` (optional). `.env.example` lists names only, never real values.
Packages to approve first: `prisma`, `@prisma/client`, `zod`, `vitest`, and
from spec 10 `jose`.

## Dependencies between specs

- 10 creates `User`, the auth guard and the rate limiter; 11–14 reuse them.
- 14 needs 11 (accounts to sign in) and 13 (OTP reissue test).
- 15 creates posts and storage; 16, 17 and 21 build on it.
- 17 creates claims; 18, 19, 20 and 21 depend on them.
- 19 creates resolutions; 20 changes them; 21 deletes posts that have them.
- 22 and 23 depend only on `User` and can follow 14 in any order.

## Per-spec checklist

1. Add the models in that spec as one new migration.
2. Write `schemas.ts`, `repository.ts`, `service.ts`, `serializer.ts`.
3. Add the thin route files, wrapped in `withApi`.
4. Write every test in the spec's table before calling it done.
5. Run `pnpm types && pnpm lint && pnpm test && pnpm build`.
6. Update `progress tracker.md`, then stop.
