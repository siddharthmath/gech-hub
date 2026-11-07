# Spec 19 — Resolve a post

## Goal

Staff approve exactly one claim, which closes the post. Staff (and the winning
claimant) can read the resolution.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/findit/posts/{id}/resolution` | office_staff |
| GET | `/api/v1/findit/posts/{id}/resolution` | office_staff, the approved claimant |

`GET` is used by the frontend (Phase 04) though it is not in the Quick Guide
table; confirm in `{baseUrl}/docs`.

## Data

    model Resolution {
      postId     String   @id @map("post_id")
      post       FoundPost @relation(fields: [postId], references: [id], onDelete: Cascade)
      claimId    String   @unique @map("claim_id")
      claim      Claim    @relation(fields: [claimId], references: [id], onDelete: Cascade)
      note       String?
      resolvedBy String   @map("resolved_by")
      resolver   User     @relation(fields: [resolvedBy], references: [emailId], onDelete: Restrict)
      resolvedAt DateTime @default(now()) @map("resolved_at")
    }

## Behaviour

**POST** JSON `{ claim_id, note? }` (`CLM-` id; note ≤ 500).
Rules in order: not staff → 403 FORBIDDEN · post missing → 404 NOT_FOUND · post
already resolved → 409 `POST_RESOLVED` · post archived (not resolved) → 409
`POST_NOT_ACTIVE` · claim missing **or on another post** → 404 NOT_FOUND · claim
not pending → 409 `CLAIM_LOCKED`.
One **transaction**: create `Resolution`; post → `resolved = true`,
`status = archived`; chosen claim → `approved`; every other claim on the post →
`rejected`. Success → **201** resolution object.

**Resolution object:** `{ post_id, claim_id, claimant: { email_id, name, role,
phone_number }, note, resolved_by: { email_id, name }, resolved_at }`.

**GET** → 200 resolution object for staff. For the **approved claimant** → 200
as well. Anyone else → 404 NOT_FOUND. Post with no resolution → 404 NOT_FOUND.
(Other users learn only `resolved: true` from the post object.)

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| POST | post with 2 claims, pick one | 201; post resolved + archived; chosen approved; other rejected |
| POST | with `note` | note stored and returned |
| POST | all inside one transaction | forced failure mid-way leaves everything unchanged |
| POST | resolve twice | second 409 POST_RESOLVED |
| POST | archived (unresolved) post | 409 POST_NOT_ACTIVE |
| POST | claim from another post | 404 NOT_FOUND |
| POST | unknown `claim_id` | 404 NOT_FOUND |
| POST | missing `claim_id` | 422 VALIDATION_ERROR |
| POST | student / admin token | 403 FORBIDDEN |
| POST | unknown post | 404 NOT_FOUND |
| GET | staff on resolved post | 200 with claimant details |
| GET | approved claimant | 200 |
| GET | rejected claimant / other student | 404 NOT_FOUND |
| GET | unresolved post | 404 NOT_FOUND |
| GET | no token | 401 UNAUTHORIZED |
| after POST | claimant's `/claims/me` | decision `approved`; others `rejected` |
| after POST | `GET /posts?status=archived` | contains the post, `resolved: true` |

## Acceptance

Two students claim; staff resolves; one pill is approved, one rejected.
