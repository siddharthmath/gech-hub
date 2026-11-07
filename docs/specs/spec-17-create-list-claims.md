# Spec 17 — Claim an item

## Goal

A user claims a found item with proof; claims on a post are listed by role.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/findit/posts/{id}/claims` | any signed-in user |
| GET | `/api/v1/findit/posts/{id}/claims?cursor=&limit=` | any signed-in user (role-scoped) |

## Data

    enum Decision { pending approved rejected }
    model Claim {
      id           String   @id           // CLM-XXXXXXXX
      postId       String   @map("post_id")
      post         FoundPost @relation(fields: [postId], references: [id], onDelete: Cascade)
      claimantId   String   @map("claimant_id")
      claimant     User     @relation(fields: [claimantId], references: [emailId], onDelete: Cascade)
      message      String
      decision     Decision @default(pending)
      createdAt    DateTime @default(now()) @map("created_at")
      updatedAt    DateTime @updatedAt @map("updated_at")
      @@unique([postId, claimantId])
      @@index([postId, createdAt, id])
      @@index([claimantId, createdAt, id])
    }

## Behaviour

**POST** JSON `{ message }`, trimmed, 10–1000 chars → else 422 VALIDATION_ERROR.
- Post missing → 404 NOT_FOUND.
- Post not `active` or already resolved → 409 `POST_NOT_ACTIVE` (feature code).
- Same user already has a claim on this post → 409 ALREADY_EXISTS (a withdrawn
  claim is deleted, so they may claim again).
- Success → **201** claim object, `decision: "pending"`.

**Claim object:** `{ id, post_id, post_title, message, decision, claimant:
{ email_id, name, role, phone_number }, created_at }`.

**GET** newest first, paged. **Office staff see every claim on the post;
everyone else sees only their own** (empty `items` if none). Post missing → 404.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| POST | student, 20-char message | 201, pending, claimant fields filled |
| POST | message 9 chars / 1001 chars | 422 VALIDATION_ERROR |
| POST | second claim, same user, same post | 409 ALREADY_EXISTS |
| POST | claim, withdraw (spec 18), claim again | 201 |
| POST | archived post | 409 POST_NOT_ACTIVE |
| POST | resolved post | 409 POST_NOT_ACTIVE |
| POST | unknown post | 404 NOT_FOUND |
| POST | two different users claim | both 201 |
| POST | no token | 401 UNAUTHORIZED |
| GET | staff, post with 2 claims | 2 items |
| GET | student with a claim, 2 claims exist | exactly 1 item (own) |
| GET | student without a claim | `items: []`, `count: 0` |
| GET | pagination, `limit=1` | cursor walks all claims for staff |
| GET | unknown post | 404 NOT_FOUND |
| GET | no token | 401 UNAUTHORIZED |

## Acceptance

Student claims an item; staff sees it, a second student does not.
