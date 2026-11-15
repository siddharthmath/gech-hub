# Spec 28 — Edit or delete my doubt

## Goal

The asker fixes a question until it is answered, or removes it any time.

## Endpoints

| Method | Path | Who |
|---|---|---|
| PATCH | `/api/v1/noticehub/doubts/{id}` | the asker |
| DELETE | `/api/v1/noticehub/doubts/{id}` | the asker |

## Backend lane

No schema change. `{id}` must be `DBT-` (else 422). Admin → 403 FORBIDDEN.
Missing, not the caller's, or on a notice the caller cannot see → 404 NOT_FOUND.

**PATCH** JSON `{ question }` (5–1000). Doubt already has a response → 409
DOUBT_ANSWERED. Success → 200 doubt object, `updated_at` changed.

**DELETE** allowed even when answered; the answer is deleted with it. Success →
200 `{ "deleted": true, "id": "DBT-..." }`.

## UI lane

Files: `src/components/notices/{doubt-actions-menu,edit-doubt-form}.tsx`,
`src/viewmodels/use-doubt-mutations.ts`.

**Flow:** on the asker's own doubts only, a small **⋯ menu**. **Edit** turns the
question into an inline textarea (Save / Cancel, same 5-char rule). Once the doubt
is answered, Edit is hidden and a quiet note reads "Answered doubts can't be
edited." **Delete** confirms ("This also deletes the answer, if any"). If the API
returns DOUBT_ANSWERED (answered while editing), show its message, close the
editor and refetch. Others never see the menu. Mutations invalidate
`['doubts', noticeId]`.

## Tests

| Layer | Case | Expect |
|---|---|---|
| PATCH | asker edits unanswered doubt | 200, new question, `updated_at` bumped |
| PATCH | answered doubt (fixture) | 409 DOUBT_ANSWERED, unchanged |
| PATCH | 4 chars / missing field | 422 VALIDATION_ERROR |
| PATCH | other student / faculty publisher | 404 NOT_FOUND |
| PATCH | admin | 403 FORBIDDEN |
| PATCH | unknown / `NTC-` id | 404 / 422 |
| DELETE | asker, unanswered | 200, row gone |
| DELETE | asker, answered | 200, doubt and answer gone |
| DELETE | other user / admin | 404 / 403 |
| DELETE | no token | 401 UNAUTHORIZED |
| UI | own vs another's doubt | menu only on own |
| UI | answered own doubt | no Edit, note shown, Delete still available |
| UI | edit save | PATCH body `{ question }`; item updates |
| UI | DOUBT_ANSWERED response | message toast, editor closes, list refetched |
| UI | delete | confirm first; item disappears |

## Acceptance

A student edits a question, then it is answered and the edit option disappears;
deleting still works.
