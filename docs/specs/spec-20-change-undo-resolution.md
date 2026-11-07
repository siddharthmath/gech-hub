# Spec 20 — Change or undo a resolution

## Goal

Staff can pick a different winner or edit the note, or undo the resolution.

## Endpoints

| Method | Path | Who |
|---|---|---|
| PATCH | `/api/v1/findit/posts/{id}/resolution` | office_staff |
| DELETE | `/api/v1/findit/posts/{id}/resolution` | office_staff |

## Data

No schema change.

## Behaviour

**PATCH** JSON, any of `claim_id`, `note` (null clears the note).
Not staff → 403 · post missing → 404 NOT_FOUND · post has no resolution → 404
NOT_FOUND · empty body → 422 VALIDATION_ERROR · new `claim_id` not on this post
→ 404 NOT_FOUND. Changing `claim_id`, in one transaction: previous winner →
`rejected`, new winner → `approved`, `Resolution.claimId` updated. The post
stays resolved/archived. Success → 200 resolution object.

**DELETE** (undo). Same 403/404 rules. In one transaction: delete the
`Resolution`, post → `resolved = false`, `status = active`, **all claims on the
post → `pending`**. Success → 200 post object (spec 15 shape).

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| PATCH | switch winner | new claim approved, old rejected, GET resolution shows new claimant |
| PATCH | note only | note changes, claims untouched |
| PATCH | `note: null` | note cleared |
| PATCH | claim from another post | 404 NOT_FOUND |
| PATCH | unresolved post | 404 NOT_FOUND |
| PATCH | empty body | 422 VALIDATION_ERROR |
| PATCH | student token | 403 FORBIDDEN |
| PATCH | failure mid-transaction | no partial change |
| DELETE | resolved post, 2 claims | post active + `resolved: false`; both claims pending |
| DELETE | afterwards GET resolution | 404 NOT_FOUND |
| DELETE | afterwards staff can resolve again | 201 |
| DELETE | afterwards student can withdraw own claim | 200 |
| DELETE | unresolved post | 404 NOT_FOUND |
| DELETE | student token / no token | 403 / 401 |
| DELETE | PATCH `status` now works on the post | 200 (no longer POST_RESOLVED) |

## Acceptance

Resolve, switch winner, undo; the post and both claims return to their
starting state.
