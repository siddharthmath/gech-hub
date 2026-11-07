# Spec 18 — My claims, withdraw a claim

## Goal

A user sees all their own claims and can withdraw a pending one.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/findit/claims/me?cursor=&limit=` | any signed-in user |
| DELETE | `/api/v1/findit/claims/{id}` | the claimant |

## Data

No schema change.

## Behaviour

**GET /claims/me** → paged claim objects (spec 17) for the caller only, across
all posts, newest first. Staff get only claims they made themselves.

**DELETE /claims/{id}** (`CLM-` id, else 422):
- Claim not found **or not the caller's** (staff included) → 404 NOT_FOUND.
- `decision` not `pending` → 409 `CLAIM_LOCKED` (feature code).
- Success → 200 `{ "deleted": true, "id": "CLM-..." }`.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| me | user with 2 claims on 2 posts | 2 items, newest first |
| me | claims of other users exist | never included |
| me | no claims | `items: []` |
| me | `limit=1` | paging covers everything once |
| me | each item has `post_title` and `decision` | true |
| me | no token | 401 UNAUTHORIZED |
| delete | own pending claim | 200, row gone, can claim again |
| delete | someone else's claim | 404 NOT_FOUND |
| delete | staff deleting a student's claim | 404 NOT_FOUND |
| delete | approved claim (fixture) | 409 CLAIM_LOCKED |
| delete | rejected claim (fixture) | 409 CLAIM_LOCKED |
| delete | unknown `CLM-` id | 404 NOT_FOUND |
| delete | `FND-12345678` as id | 422 VALIDATION_ERROR |
| delete | no token | 401 UNAUTHORIZED |

## Acceptance

Claim, see it in `/claims/me`, withdraw it, list is empty again.
