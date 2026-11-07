# Spec 12 — View and edit a user

## Goal

Admin opens one account and corrects its profile fields.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/admin/users/{email_id}` | admin |
| PATCH | `/api/v1/admin/users/{email_id}` | admin |

## Data

No schema change.

## Behaviour

`{email_id}` is URL-decoded and lowercased. Only student, faculty and
office_staff rows are reachable; the admin row and unknown emails → 404 NOT_FOUND.

**GET** → 200 user object (same as spec 11, with `otp`).

**PATCH** JSON, sends only what changes. Editable: `name`, `phone_number`,
`usn`, `dept`, `designation`, each with the spec 11 rules.
- Field not valid for this user's role (e.g. `usn` on faculty) → 422
  FIELD_NOT_ALLOWED_FOR_ROLE.
- `role` or `email_id` in the body → 422 VALIDATION_ERROR (identity is
  read-only).
- Empty body → 422 VALIDATION_ERROR.
- Success → 200 updated user object. `updated_at` changes; OTP does not.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| GET | existing student | 200, includes `otp` |
| GET | email with `%40` encoding | 200 |
| GET | unknown email | 404 NOT_FOUND |
| GET | admin's own email | 404 NOT_FOUND |
| GET | student token / no token | 403 / 401 |
| PATCH | change `phone_number` | 200, DB updated, `otp` unchanged |
| PATCH | change `dept` on student | 200 |
| PATCH | `usn` on faculty | 422 FIELD_NOT_ALLOWED_FOR_ROLE |
| PATCH | `role` in body | 422 VALIDATION_ERROR |
| PATCH | `email_id` in body | 422 VALIDATION_ERROR |
| PATCH | bad phone | 422 VALIDATION_ERROR, `details[0].field = "phone_number"` |
| PATCH | empty `{}` | 422 VALIDATION_ERROR |
| PATCH | unknown email | 404 NOT_FOUND |
| PATCH | non-admin token | 403 FORBIDDEN |

## Acceptance

Edit a phone number; `GET` shows the new value.
