# Spec 11 — Create and list users

## Goal

Admin creates campus accounts and lists them (with OTPs).

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/admin/users` | admin |
| GET | `/api/v1/admin/users?role=&cursor=&limit=` | admin |

## Data

No schema change (uses `User`). Add `core/otp.ts`: `generateOtp()` = 6 digits
from `crypto.randomInt`.

## Behaviour

**POST** JSON, `role` decides the required fields, **all required**:

| role | fields |
|---|---|
| student | name, usn, dept, email_id, phone_number |
| faculty | name, designation, email_id, phone_number |
| office_staff | name, dept, designation, email_id, phone_number |

Rules (in `modules/users/schemas.ts`, one schema per role):
- `role` must be student, faculty or office_staff. `admin` or anything else →
  422 VALIDATION_ERROR.
- A field that does not belong to the role (e.g. `usn` on faculty) → 422
  FIELD_NOT_ALLOWED_FOR_ROLE with `details[].field`.
- `email_id`: trimmed, lowercased, valid email, domain must equal
  `TEAM_EMAIL_DOMAIN` → else 422 EMAIL_DOMAIN_MISMATCH.
- `phone_number`: exactly 10 digits. `usn`: 5–20 letters/digits, stored
  uppercase. `name` 2–100. `dept`, `designation` 2–100.
- Existing email → 409 ALREADY_EXISTS.
- Success → **201** with the user object **including `otp`**.

**User object** (admin views): `{ email_id, role, name, phone_number, otp,
created_at }` plus only the role's own fields (`usn`+`dept`, `designation`, or
`dept`+`designation`). Other fields are omitted.

**GET** newest first (`created_at desc, email_id desc`), never returns the admin
row. `role` filter accepts student / faculty / office_staff, else 422. Paged
with the shared cursor helper.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| POST | valid student | 201, `otp` is 6 digits, usn uppercased, row in DB |
| POST | valid faculty / office_staff | 201 with only their fields |
| POST | duplicate email | 409 ALREADY_EXISTS |
| POST | email on another domain | 422 EMAIL_DOMAIN_MISMATCH |
| POST | faculty body with `usn` | 422 FIELD_NOT_ALLOWED_FOR_ROLE |
| POST | missing `phone_number` | 422 VALIDATION_ERROR |
| POST | phone `+919876543210` or 9 digits | 422 VALIDATION_ERROR |
| POST | usn `ab1` | 422 VALIDATION_ERROR |
| POST | `role: "admin"` | 422 VALIDATION_ERROR |
| POST | student token / no token | 403 FORBIDDEN / 401 UNAUTHORIZED |
| GET | 3 users, `limit=2` | 2 items, `next_cursor` set; second page 1 item, `null` |
| GET | `role=faculty` | only faculty |
| GET | `role=admin` | 422 VALIDATION_ERROR |
| GET | admin row is never listed | not in `items` |
| GET | items contain `otp` | true |
| GET | student token | 403 FORBIDDEN |

## Acceptance

Create a student with `curl`, then see them (with OTP) in the list.
