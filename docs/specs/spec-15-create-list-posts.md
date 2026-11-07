# Spec 15 — Post and browse found items

## Goal

Office staff post found items with photos; everyone can browse them.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/findit/posts` | office_staff |
| GET | `/api/v1/findit/posts?status=&cursor=&limit=` | any signed-in user |

## Data

    enum PostStatus { active archived }
    model FoundPost {
      id            String     @id            // FND-XXXXXXXX
      title         String
      description   String?
      locationFound String?    @map("location_found")
      foundOn       DateTime?  @map("found_on") @db.Date
      status        PostStatus @default(active)
      resolved      Boolean    @default(false)
      postedBy      String     @map("posted_by")
      poster        User       @relation(fields: [postedBy], references: [emailId], onDelete: Restrict)
      images        FoundPostImage[]
      createdAt     DateTime   @default(now()) @map("created_at")
      updatedAt     DateTime   @updatedAt @map("updated_at")
      @@index([status, createdAt, id])
    }
    model FoundPostImage {
      id          String @id @default(cuid())
      postId      String @map("post_id")
      post        FoundPost @relation(fields: [postId], references: [id], onDelete: Cascade)
      storageKey  String @map("storage_key")
      contentType String @map("content_type")
      sizeBytes   Int    @map("size_bytes")
      position    Int
      @@index([postId, position])
    }

`core/storage.ts`: interface `put(key, bytes, contentType)`, `signedUrl(key,
ttlSeconds = 900)`, `remove(key)`. Ship one driver now: local disk (dev/test),
with signed links served by an **internal** route `app/api/files/[...key]`
(outside `/api/v1`, not part of the public contract). A production object-storage
driver is a later swap behind the same interface; routes and services do not
change.

## Behaviour

**POST** `multipart/form-data`: `title` (required, 3–100), `description`
(≤ 2000), `location_found` (2–120), `found_on` (`YYYY-MM-DD`, not in the
future), `images` (0–5 files, each ≤ 5MB, JPEG/PNG/WebP, checked by content
type **and** magic bytes). Only office_staff → else 403 FORBIDDEN. Errors:
more than 5 → 422 `TOO_MANY_IMAGES`; a file over 5MB → 422 `IMAGE_TOO_LARGE`;
other type → 422 `UNSUPPORTED_IMAGE_TYPE` (feature codes of this spec; the
file name goes in `details[].field`). Validation happens before anything is
stored. Success → **201** post object. New post is `active`, `resolved: false`.

**Post object:** `{ id, title, description, location_found, found_on, images:
[{ url }], status, resolved, posted_by: { email_id, name, dept }, created_at,
updated_at }`. `url` is a fresh signed link (15 min). No phone number here.

**GET** any role including admin. `status` = `active` (default) or `archived`,
else 422. Resolved posts are archived, so they show under `archived`. Newest
first, shared cursor helper.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| POST | staff, title only | 201, active, `images: []` |
| POST | staff, 3 valid images | 201, 3 `url`s in order, files in storage |
| POST | 6 images | 422 TOO_MANY_IMAGES, nothing stored, no row |
| POST | 6MB image | 422 IMAGE_TOO_LARGE |
| POST | PDF renamed `.png` | 422 UNSUPPORTED_IMAGE_TYPE |
| POST | title 2 chars | 422 VALIDATION_ERROR |
| POST | future `found_on` | 422 VALIDATION_ERROR |
| POST | student / faculty / admin token | 403 FORBIDDEN |
| POST | no token | 401 UNAUTHORIZED |
| GET | default | active posts only, newest first |
| GET | `status=archived` | archived only |
| GET | `status=bogus` | 422 VALIDATION_ERROR |
| GET | 3 posts, `limit=2` | cursor pages through all 3 exactly once |
| GET | student and admin token | 200 |
| GET | image `url` | resolves to the file until expiry; tampered signature rejected |
| GET | no token | 401 UNAUTHORIZED |

## Acceptance

Staff posts an item with photos via `curl`; it is first in the list.
