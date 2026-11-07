# GECHhub

One Next.js project holding the **frontend and the backend API** (route handlers
+ Prisma + PostgreSQL). Track 01: FindIt, Lost & Found. The contract is the API
  Quick Guide (`docs/GECHhub_API_Quick_Guide.docx`): endpoints, methods, roles and
  field names are fixed, never invented. Why a rule exists: `docs/project-doc.md`.
  After every meaningful implementation, update `progress tracker.md`.

## Stack

Next.js 16 (App Router), React 19, strict TypeScript, Tailwind v4, shadcn/ui,
Zustand, TanStack Query, React Hook Form + Zod, Prisma + PostgreSQL, Vitest
(+ RTL, MSW), Playwright, pnpm. If unsure about an API, read the docs inside the
installed package, not memory.

## Backend contract

- Same origin: the UI calls `/api/v1/...`. `NEXT_PUBLIC_API_URL` is an override.
- Public paths: `/api/v1/auth/*`, `/users/me`, `/findit/*`, `/admin/*`, and
  `GET /api/health`. Nothing else.
- Bearer JWT on everything except login and health (HS256, 12h,
  `{ sub, role, teamId, dept? }`).
- Lists: `{ items, count, next_cursor }`, newest first. Errors always:
  `{ error: { code, message, details }, request_id }`; clients branch on `code`.
- IDs are server-made: `FND-` post, `CLM-` claim, `LST-` lost request.
- Dates: `YYYY-MM-DD` for date-only fields; UTC timestamps, shown in IST.
- Admin and user sessions are separate; never send an admin token to FindIt.
- Code/status map and per-endpoint rules: `docs/specs/README.md` and the specs.

## How we work

Spec driven; nothing is built without a spec.
- `docs/specs/spec-NN-*.md`: backend, **one goal, 2 endpoints, test cases each**.
- `docs/specs/phase-NN-*.md`: frontend phases.

**Starting a spec:** read this file and that spec, build exactly that, write its
tests, stop. One spec at a time, in order. **Fresh context:** read the specs
README, git log and tracker; say what you worked out before building.
**Acceptance is mine to run.** You verify `pnpm types`, `lint`, `test`, `build`.
If a spec is ambiguous or wrong, say so; reset rather than patch.

## Backend layout (enforced)

    app/api/v1/<path>/route.ts     thin: parse → service → respond, wrapped in withApi
    src/server/core/               errors, withApi, validate, ids, pagination,
                                   auth, rate-limit, storage, env, db
    src/server/modules/<feature>/  schemas · service · repository · serializer
    prisma/ (schema, migrations, seed)    tests/<feature>/ + tests/factories.ts

- Route → service → repository. Rules and transactions live in services;
  **only repositories import Prisma.**
- Handlers throw `ApiError(code, message, details?)`; never hand-build errors.
- `requireAuth(request, { roles })` re-reads the user from the DB.
- Owner-scoped records answer **404** to non-owners.
- Multi-row state changes run in one transaction.
- Files go through `core/storage`; signed `url`s last ~15 min and are never stored.
- Migrations are additive, one per spec; never edit an applied one.

**Stay evolutionary:** a new feature is a new module + route folder + migration,
with no edits to another module's repository. `core/` only grows. Responses only
gain optional fields. Policy (limits, rate-limit, `assertCanManagePost`) lives in
one place. Don't build ahead of the current spec.

## Frontend (MVVM)

`src/lib/api/` is the only code that knows the base URL or calls `fetch`; types
are transcribed 1:1 from the contract. `src/viewmodels/` owns TanStack Query and
Zustand. `src/components/` is presentational. `app/` is routes and layout; guards
are UX, not security.

## Conventions

- Strict TS, no `any`. Comment decisions, not syntax. One obvious way.
- Validate every body/query with Zod; limits are named constants.
- User text renders as text; never `dangerouslySetInnerHTML`.
- OTPs are credentials: never logged, never in URLs, returned only by admin
  endpoints.
- Tests: Vitest on `DATABASE_URL_TEST` only; call handlers with `new Request()`;
  assert status + `error.code`. Cover happy path, auth, role, validation and
  every code the spec lists.
- Status colors: active green, resolved blue, archived gray, pending amber,
  rejected red. Storage keys and events use the `gechhub` prefix.

## Things not to do

Breaking one is worse than not finishing.
- **Never add or change an endpoint outside the Quick Guide.** If the guide is
  silent, say so and ask. Internal helper routes (e.g. `app/api/files`) must be
  named in their spec.
- **Never import Prisma outside a repository.**
- **Never expose fields the role can't see.** Hide, don't disable.
- **Don't install a package without asking.** Name it, say why, wait.
- **Don't weaken a check.** A check that can't run must fail loudly (missing
  `DATABASE_URL_TEST` fails the run). Never test against a non-test database.
- **Don't leave the build broken.** Report failures instead of working around them.
- **Don't hard-code data.** Lists come from the database.