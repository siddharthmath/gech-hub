# Spec 16 — View and edit a found item

## Goal

Open one found item; staff can edit it and archive or reopen it.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/findit/posts/{id}` | any signed-in user |
| PATCH | `/api/v1/findit/posts/{id}` | office_staff |

## Data

No schema change.

## Behaviour

`{id}` must be a `FND-` id → else 422 VALIDATION_ERROR. Missing → 404 NOT_FOUND.

**GET** → 200 post object (spec 15).

**PATCH** accepts JSON or `multipart/form-data`; only sent fields change.
Editable: `title`, `description`, `location_found`, `found_on` (same rules as
create), `status` (`active` or `archived`), `images`, `remove_images=true`.
- Not office_staff → 403 FORBIDDEN. (All ownership/manage checks go through
  `assertCanManagePost(user, post)` in the service; today it only checks role.)
- `images` sent → **replaces all** existing images (old files removed after the
  DB commit); same image errors as create. `remove_images=true` deletes all.
- `status` change on a **resolved** post → 409 `POST_RESOLVED` (feature code;
  the way back is undoing the resolution, spec 20). Other field edits on a
  resolved post are allowed.
- Empty body → 422 VALIDATION_ERROR.
- Success → 200 updated post object.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| GET | existing post, student token | 200 all fields, images with `url` |
| GET | unknown `FND-` id | 404 NOT_FOUND |
| GET | `CLM-12345678` as id | 422 VALIDATION_ERROR |
| GET | no token | 401 UNAUTHORIZED |
| PATCH | change title | 200, other fields untouched |
| PATCH | `status=archived` | 200 archived; GET list under archived |
| PATCH | `status=active` on archived (unresolved) | 200 active |
| PATCH | `status` on resolved post (fixture) | 409 POST_RESOLVED |
| PATCH | title on resolved post | 200 |
| PATCH | new `images` (2) on post with 3 | exactly the 2 new remain |
| PATCH | `remove_images=true` | `images: []` |
| PATCH | 6 images / 6MB / wrong type | TOO_MANY_IMAGES / IMAGE_TOO_LARGE / UNSUPPORTED_IMAGE_TYPE, old images intact |
| PATCH | `status: "resolved"` | 422 VALIDATION_ERROR |
| PATCH | empty body | 422 VALIDATION_ERROR |
| PATCH | student token | 403 FORBIDDEN |
| PATCH | unknown id | 404 NOT_FOUND |

## Acceptance

Edit, archive and reopen a post with `curl`; list endpoints reflect each step.
