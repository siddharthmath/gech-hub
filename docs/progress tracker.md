# Progress Tracker

Keep this file short. Read the phase specs + code for detail.

## Phase

- **GECHhub Backend Spec 00 — Project readiness** — Implemented; tests require a dedicated `DATABASE_URL_TEST`
- **GECHhub Backend Spec 10 — Admin sign-in** — Implemented and browser-verified; types, lint, and build pass; database-backed route tests not run (no local database in this workflow)
- **GECHhub Backend Spec 11 — Create and list users** — Implemented; route tests added; acceptance pending
- **GECHhub Backend Spec 12 — View and edit a user** — Implemented; route tests added; production build passes; browser verified admin login, user detail GET, profile PATCH, and refreshed values in the edit dialog

- **GECHhub Backend Spec 13 — Remove user, reissue OTP** — Implemented; route tests added; types, lint, and build pass; tests pending DATABASE_URL_TEST
- **GECHhub Backend Spec 14 — User sign-in** — Implemented; user OTP login and fresh role-scoped profile routes added with route tests; acceptance pending
- **GECHhub Backend Spec 15 — Post and browse found items** — Implemented; post/image schema and migration, staff create and authenticated list routes, local signed file storage, and route tests added; acceptance pending
- **Phase 03 — Item detail + claims** — Implemented; manual acceptance pending
- **Phase 04 — Staff posting + resolution** — Implemented; manual acceptance pending
- **Phase 05 — Lost requests** — Implemented; manual acceptance pending
- **Phase 06 — My claims + polish** — Implemented; manual acceptance pending
- **Phase 07 — Production verification** — Build and unauthenticated production route smoke checks complete; live backend manual acceptance pending
- **Phase 08 — Admin user management** — Implemented; live admin backend acceptance pending
- **Phase 09 — Responsive role surfaces** — Implemented; student/faculty/staff live-session checks pending
- Next: Complete Phase 08 manual acceptance and finish the live release checklist

## Stack (quick)

| Layer | Tech |
| --- | --- |
| App | Next.js 16 + React 19 + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI primitives) |
| Auth | Zustand persisted session, email + OTP |
| API | Live GECHhub backend via `../src/lib/api/client.ts` |
| Types | `../src/lib/api/types.ts` |

## Done / in progress

- UI polish: restored the dark theme's neutral black and dark-gray palette in `../app/globals.css`.
- Mobile-first navigation and profile menus across FindIt roles and the separate admin surface; profile details reflect API fields and role capabilities.
- Fixed Base UI dropdown profile labels by placing each `DropdownMenuLabel` inside its required `DropdownMenuGroup` in both app and admin shells.
- Endpoint audit: added the missing FindIt `GET /api/v1/users/me` profile refresh in the app shell and enabled resolution detail reads for approved claimants as well as staff.
- Mobile FindIt navigation now opens in the shadcn sidebar from the top bar; the fixed bottom navigation is removed.
- Admin account creation now accepts only exactly 10 numeric digits for phone numbers.
- Student USN fields show the accepted 5–20 alphanumeric format with an example.
- The active found-items empty state links directly to the lost-report screen.
- Staff photo uploads now show removable image previews before submission.
- Desktop app screens now share a full-width canvas up to 120rem, with wider-screen grids and single-report cards spanning the available row.
- Found items, claims, and lost-report collections now use 12-column responsive grids with matching loading layouts, so cards span the content area evenly from mobile through wide screens.
- FindIt and admin route shells now let their content use the full fluid viewport width; a single claim card spans the full row like a single lost report.

| Phase | Feature | Status / key locations |
| --- | --- | --- |
| 01 | Foundation, API client, auth | In progress — `src/lib/api/*`, `../src/store/session.ts`, `app/login/page.tsx`, `src/components/auth/*` |
| 02 | Found items gallery | Implemented; manual acceptance pending — `../app/(app)/findit/page.tsx`, `src/viewmodels/use-found-posts.ts`, `src/components/findit/*` |
| 03 | Item detail + claims | Implemented; manual acceptance pending — `../app/(app)/findit/[postId]/page.tsx`, `src/viewmodels/use-post.ts`, `src/viewmodels/use-claims.ts`, `src/components/findit/*` |
| 04 | Staff posting + resolution | Implemented; manual acceptance pending — `../src/components/findit/post-form-dialog.tsx`, `src/viewmodels/use-staff-workflows.ts`, `src/lib/api/endpoints.ts`, gallery and item detail screens |
| 05 | Lost requests | Implemented; manual acceptance pending — `../app/(app)/findit/lost-requests/page.tsx`, `src/components/lost/*`, `src/viewmodels/use-lost-requests.ts`, `src/lib/api/endpoints.ts` |
| 06 | My claims + polish | Implemented; manual acceptance pending — `app/(app)/claims/*`, `../src/viewmodels/use-claims.ts`, shared dialogs and mutation feedback |
| 07 | Production verification | Build and production route smoke checks complete; live backend acceptance pending — `docs/release-checklist.md`, `../src/lib/api/client.ts` |
| 08 | Admin user management | Implemented; live admin backend acceptance pending — `../app/admin-login/page.tsx`, `app/admin/*`, `src/features/admin/*`, `src/store/admin-session.ts`, `src/viewmodels/use-admin-users.ts` |
| 09 | Responsive role surfaces | Implemented; student/faculty/staff live-session checks pending — `specs/phase-09-responsive-audit.md`, shared dialog, admin cards, responsive hooks |
| 00 | GECHhub backend readiness | Implemented — health route and shared API foundation |
| 10 | Admin sign-in | Implemented — admin login/profile routes, auth guard, persistent lockout, seeded test team/accounts and route tests; browser login/profile verified; types, lint, and build pass; database-backed route tests not run (no local database in this workflow) |

## Architecture invariants

- Follow `project-doc.md`, `docs/architecture.md`, and the active `docs/specs/phase-NN-*.md` before implementation.
- The live backend is the source of truth. Call only documented endpoints through `../src/lib/api/client.ts`; admin calls use the separate admin session scope.
- Keep API types faithful to `architecture.md`; do not invent fields or mock app data.
- Keep server data out of local state; mutations invalidate query data when query support is added.
- Hide actions unavailable to the current role; the API remains the authorization boundary.
- Render user-provided text as text, never HTML. Display API dates in IST; `found_on` stays `YYYY-MM-DD`.

## Open

- Complete Phase 01 and Phase 02 manual acceptance checks.
- Complete the outstanding Phase 06 unit/Playwright coverage.
- Complete Phase 08 live acceptance using organiser-provided admin credentials and the issued team email domain.

## Context files (read order for new work)

1. `../CLAUDE.md`
2. `project-doc.md`
3. `architecture.md`
4. Active `docs/specs/phase-NN-*.md`
5. This tracker

- **GECHhub Backend Spec 16 — View and edit a found item** — Implemented; authenticated detail and staff edit/archive/reopen routes, image replacement/removal, and route tests added; acceptance pending
