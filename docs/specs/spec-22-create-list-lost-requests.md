# Spec 22 — Report and list lost items

## Goal

Any non-admin user reports a lost item; staff see everyone's reports, everyone
else sees their own.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/findit/lost-requests` | student, faculty, office_staff |
| GET | `/api/v1/findit/lost-requests?status=&mine=&cursor=&limit=` | student, faculty, office_staff |

## Data

    model LostRequest {
      id           String     @id            // LST-XXXXXXXX
      requesterId  String     @map("requester_id")
      requester    User       @relation(fields: [requesterId], references: [emailId], onDelete: Cascade)
      title        String
      description  String?
      locationLost String?    @map("location_lost")
      lostOn       DateTime?  @map("lost_on") @db.Date
      status       PostStatus @default(active)
      createdAt    DateTime   @default(now()) @map("created_at")
      updatedAt    DateTime   @updatedAt @map("updated_at")
      @@index([status, createdAt, id])
      @@index([requesterId, status, createdAt, id])
    }

## Behaviour

Admin token on either endpoint → 403 FORBIDDEN.

**POST** JSON `{ title*, description, location_lost, lost_on }`: `title` 3–100,
`description` ≤ 2000, `location_lost` 2–120, `lost_on` `YYYY-MM-DD` not in the
future. Success → **201** lost-request object, `status: "active"`.

**Lost-request object:** `{ id, title, description, location_lost, lost_on,
status, requester: { email_id, name, role, phone_number }, created_at,
updated_at }`.

**GET** `status` = `active` (default) or `archived`, else 422. **Staff see
everyone's**; `mine=true` narrows staff to their own. **Student/faculty always
see only their own** (`mine` has no effect). Newest first, paged.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| POST | student, title only | 201, active, requester filled |
| POST | all fields | 201 echoes every field |
| POST | title 2 chars | 422 VALIDATION_ERROR |
| POST | future `lost_on` | 422 VALIDATION_ERROR |
| POST | staff and faculty | 201 |
| POST | admin token | 403 FORBIDDEN |
| POST | no token | 401 UNAUTHORIZED |
| GET | student with 1 own, 1 other's exists | exactly 1 item |
| GET | student passes `mine=false` | still only own |
| GET | staff | all items |
| GET | staff `mine=true` | only own |
| GET | `status=archived` | archived only |
| GET | `status=bogus` | 422 VALIDATION_ERROR |
| GET | `limit=1` paging | every item exactly once |
| GET | staff sees `phone_number` of requesters | true |
| GET | admin token | 403 FORBIDDEN |

## Acceptance

Student reports an item; a second student cannot see it; staff can.
