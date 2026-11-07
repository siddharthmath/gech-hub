# Spec 13 — Remove a user, reissue an OTP

## Goal

Admin can delete an account or replace its OTP.

## Endpoints

| Method | Path | Who |
|---|---|---|
| DELETE | `/api/v1/admin/users/{email_id}` | admin |
| POST | `/api/v1/admin/users/{email_id}/regenerate-otp` | admin |

## Data

No schema change now. Later specs attach FindIt tables to `User`; their foreign
keys decide what deletion does (spec 15 uses `Restrict` for posts, specs 17 and
22 use `Cascade` for claims and lost requests). This spec only maps a database
FK refusal to the error below, so it keeps working as features are added.

## Behaviour

Same `{email_id}` rules as spec 12 (admin row and unknown → 404 NOT_FOUND).

**DELETE** → 200 `{ "deleted": true, "email_id": "..." }`. If the database
refuses (Prisma `P2003` on a Restrict FK) → 409 `USER_HAS_RECORDS` with a
readable message. This is a feature code added by this spec. The user's
existing tokens stop working because the guard re-reads the DB (spec 10).

**POST regenerate-otp** → 200 with the user object including the **new** `otp`.
The old OTP no longer works. No request body.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| DELETE | existing user | 200, row gone, `/auth/login` later fails |
| DELETE | deleted user's old token passed to `requireAuth` | 401 UNAUTHORIZED |
| DELETE | unknown email | 404 NOT_FOUND |
| DELETE | admin's own row | 404 NOT_FOUND |
| DELETE | FK refusal (simulate with a repository that throws P2003) | 409 USER_HAS_RECORDS |
| DELETE | non-admin / no token | 403 / 401 |
| regenerate | existing user | 200, new `otp` ≠ old, DB updated, 6 digits |
| regenerate | called twice | each response has a different valid current OTP |
| regenerate | unknown email | 404 NOT_FOUND |
| regenerate | non-admin / no token | 403 / 401 |

## Acceptance

Regenerate an OTP; the old value fails at login (verify after spec 14).
Delete a user; the row is gone from the list.
