# Spec 23 — Edit, archive and delete a lost item

## Goal

The owner edits a lost report, marks it found (archived), reactivates it, or
deletes it.

## Endpoints

| Method | Path | Who |
|---|---|---|
| PATCH | `/api/v1/findit/lost-requests/{id}` | the owner |
| DELETE | `/api/v1/findit/lost-requests/{id}` | the owner |

## Data

No schema change.

## Behaviour

Admin token → 403 FORBIDDEN. `{id}` must be `LST-` (else 422). Missing **or not
the caller's** (staff included) → 404 NOT_FOUND.

**PATCH** JSON, any of `title`, `description`, `location_lost`, `lost_on`,
`status` (`active` | `archived`), same rules as create. Empty body → 422
VALIDATION_ERROR. Success → 200 lost-request object. "Mark as found" is
`status: "archived"`; "Reactivate" is `status: "active"`.

**DELETE** → 200 `{ "deleted": true, "id": "LST-..." }`.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| PATCH | owner edits title | 200, other fields untouched |
| PATCH | owner `status=archived` | 200; appears under `status=archived` list |
| PATCH | owner `status=active` on archived | 200 |
| PATCH | `status: "resolved"` | 422 VALIDATION_ERROR |
| PATCH | future `lost_on` / short title | 422 VALIDATION_ERROR |
| PATCH | empty body | 422 VALIDATION_ERROR |
| PATCH | another student's request | 404 NOT_FOUND |
| PATCH | staff on a student's request | 404 NOT_FOUND |
| PATCH | admin token | 403 FORBIDDEN |
| PATCH | unknown / wrong-kind id | 404 / 422 |
| PATCH | no token | 401 UNAUTHORIZED |
| DELETE | owner | 200, row gone, not in list |
| DELETE | another student | 404 NOT_FOUND, row still exists |
| DELETE | staff on a student's request | 404 NOT_FOUND |
| DELETE | admin token | 403 FORBIDDEN |
| DELETE | unknown / wrong-kind id | 404 / 422 |
| DELETE | owner's user deleted (spec 13) | their requests are gone (cascade) |

## Acceptance

Report, mark found, reactivate, delete. Another user's attempts all fail with
404.

## Next (not part of this spec)

A frontend integration spec: point `src/lib/api/client.ts` at the same origin
and run the existing Phase 02–09 acceptance checks against this backend.
