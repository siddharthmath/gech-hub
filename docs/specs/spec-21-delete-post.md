# Spec 21 — Delete a found item

## Goal

Staff can delete a found item unless a claim is still pending. This is the only
endpoint in this spec because its rules touch posts, claims, resolution and
stored files.

## Endpoint

| Method | Path | Who |
|---|---|---|
| DELETE | `/api/v1/findit/posts/{id}` | office_staff |

## Data

No schema change. Relies on existing cascades: deleting a post removes its
images rows, claims and resolution.

## Behaviour

Order: not staff → 403 FORBIDDEN · bad id → 422 · missing → 404 NOT_FOUND · any
claim with `decision = pending` → 409 `POST_HAS_PENDING_CLAIMS` · else delete
the post in a transaction, **then** remove its files from storage (a storage
failure is logged, never returned). Success → 200 `{ "deleted": true, "id":
"FND-..." }`.
A resolved post has no pending claims, so it can be deleted. A post with no
claims can be deleted. Approved/rejected claims go with it.

## Tests

| Case | Expect |
|---|---|
| active post, no claims | 200, row + images + files gone |
| active post, 1 pending claim | 409 POST_HAS_PENDING_CLAIMS, nothing deleted |
| resolved post with approved + rejected claims | 200, claims and resolution gone |
| after undo-resolution, claims pending again | 409 POST_HAS_PENDING_CLAIMS |
| archived (unresolved) post with pending claim | 409 POST_HAS_PENDING_CLAIMS |
| storage `remove` throws | still 200, row gone |
| unknown `FND-` id | 404 NOT_FOUND |
| `LST-12345678` as id | 422 VALIDATION_ERROR |
| student / faculty / admin token | 403 FORBIDDEN |
| no token | 401 UNAUTHORIZED |
| deleted post's image `url` | no longer serves |
| deleted user who was the poster (spec 13) | 409 USER_HAS_RECORDS until the post is deleted |

## Acceptance

Delete is blocked while a claim is pending and succeeds after resolution.
