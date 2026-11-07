# Phase 07 — Production build verification

## Behaviour

Prove the shipped build against the live backend.

- `pnpm build` clean; start the production server (`pnpm start`) and re-run
  the Phase 02–06 acceptance checks against it — dev-only behaviour must not
  be carrying anything.
- Env hygiene: base URL comes from `NEXT_PUBLIC_API_URL`, defaulting to the
  configured live backend. No secrets in the client bundle
  (there are none to have — OTP login only).
- Token handling: nothing sensitive in URLs; token in storage only.
- Checklist file `docs/release-checklist.md` filled with live results.

## Acceptance check (manual)

1. Production build serves every route without errors.
2. Login, gallery, claim, resolution, lost requests all work against the
   live backend from the production build.
3. Release checklist complete and committed.
