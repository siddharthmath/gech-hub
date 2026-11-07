# GECHhub Backend — Spec 00: Project readiness

## Goal

Get the existing Next.js project ready to host the API. Add no feature
endpoints. The only endpoint here is `GET /api/health`.

## Project decisions

- Keep the existing frontend and the root `app/` directory. Next.js cannot use
  both root `app/` and `src/app/`, so API routes live in `app/api/...`.
- Backend code lives in `src/server/`; Prisma in `prisma/`.
- Layers: **route → service → repository**. Routes only parse the request and
  return the response. Services hold rules. Repositories are the only code that
  imports Prisma.
- PostgreSQL via `DATABASE_URL`. Tests use a separate `DATABASE_URL_TEST`.
- Contract (envelopes, codes, ids, dates, bodies): `docs/specs/README.md`.

## Layout

    app/api/health/route.ts
    app/api/v1/<path>/route.ts          thin route files only
    src/server/core/                    shared kernel (additive changes only)
    src/server/modules/<feature>/       schemas.ts · service.ts · repository.ts · serializer.ts
    prisma/schema.prisma · migrations/ · seed.ts
    tests/<feature>/*.test.ts · tests/factories.ts

## Shared kernel that must exist before spec 10

| File | Provides |
|---|---|
| `core/errors.ts` | `ApiError(code, message, details?)` and the code → HTTP status map |
| `core/api.ts` | `withApi(handler)`: adds `request_id`, turns thrown errors into the error envelope, 500 → `INTERNAL` without leaking details |
| `core/validate.ts` | `parseBody(schema, request)` (JSON, 16KB cap) and `parseQuery`; Zod issues → `VALIDATION_ERROR` with `details[{field,message}]` |
| `core/ids.ts` | `newId('FND')`, `parseId('FND', raw)` |
| `core/pagination.ts` | `encodeCursor`, `decodeCursor`, `pageOf(rows, limit)` → `{items,count,next_cursor}` |
| `core/db.ts` | single Prisma client |
| `core/env.ts` | validated env (see below), fails loudly on boot |
| `tests/factories.ts`, `tests/setup.ts` | DB truncate + helpers |

## Environment

`DATABASE_URL`, `DATABASE_URL_TEST`, `JWT_SECRET` (≥ 32 chars), `TEAM_ID`,
`TEAM_EMAIL_DOMAIN` (e.g. `team1.com`), `ADMIN_EMAIL_ID`, `ADMIN_OTP`,
`ADMIN_NAME` (optional). Add them to `.env.example` with no real values.

## Packages (ask before installing)

`prisma`, `@prisma/client`, `zod`, `vitest`, and from spec 10 `jose` (JWT).

## Tests

| Case | Expect |
|---|---|
| `GET /api/health` | 200 `{ "status": "ok" }` |
| `withApi` throws `ApiError('NOT_FOUND')` | 404 envelope with `request_id` |
| `withApi` throws unknown error | 500, no stack in body |
| `parseBody` with 17KB body / bad JSON | error envelope, nothing parsed |
| `parseId('FND','CLM-AAAA1111')` | 422 `VALIDATION_ERROR` |
| cursor round trip | decode(encode(x)) equals x; garbage cursor → 422 |

## Acceptance

`pnpm types`, `pnpm lint`, `pnpm test`, `pnpm build` pass; first migration
committed; health route returns `{ "status": "ok" }`.
