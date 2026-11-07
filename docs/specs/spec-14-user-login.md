# Spec 14 — User sign-in

## Goal

Students, faculty and office staff sign in with email + OTP and read their
profile.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/auth/login` | public |
| GET | `/api/v1/users/me` | student, faculty, office_staff |

## Data

No schema change. Reuses `signToken`, `requireAuth` and the rate limiter.

## Behaviour

**POST /auth/login** body `{ email_id, otp }` (trimmed, email lowercased).
Order of checks:
1. Validate body → 422 VALIDATION_ERROR.
2. `assertNotLocked("user:" + email)` → 429 RATE_LIMITED.
3. Email belongs to the admin row → 403 USE_ADMIN_LOGIN ("use the admin
   login"). Feature code of this spec.
4. Email domain ≠ `TEAM_EMAIL_DOMAIN` → 400 UNKNOWN_INSTITUTION.
5. Unknown email or wrong OTP (constant-time compare) → record failure, 401
   INVALID_CREDENTIALS (same message for both).
6. Success → 200 `{ access_token, expires_in: 43200, profile }`. Token payload
   `{ sub: email, role, teamId: TEAM_ID, dept? }`; `dept` only for office_staff.

**Profile** = `{ email_id, role, name, phone_number }` plus the role's own
fields (`usn`, `dept`, `designation`). **Never** includes `otp`.

**GET /users/me** → 200 the same profile, read fresh from the DB. Admin token →
403 FORBIDDEN (admins use `/admin/me`).

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| login | student, correct OTP | 200, token role student, `teamId` set, no `dept` in token |
| login | office_staff, correct OTP | token has `dept` |
| login | wrong OTP | 401 INVALID_CREDENTIALS |
| login | unknown email on team domain | 401 INVALID_CREDENTIALS |
| login | email on other domain | 400 UNKNOWN_INSTITUTION |
| login | admin email + admin OTP | 403 USE_ADMIN_LOGIN |
| login | OTP regenerated (spec 13) then old OTP | 401; new OTP 200 |
| login | 5 failures then correct OTP | 429 RATE_LIMITED |
| login | missing `email_id` | 422 VALIDATION_ERROR |
| login | profile has no `otp` | true |
| me | student token | 200 student fields only |
| me | office_staff token | includes `dept`, `designation` |
| me | after PATCH of phone (spec 12) | shows new phone |
| me | admin token | 403 FORBIDDEN |
| me | no / bad / expired token | 401 UNAUTHORIZED / INVALID_TOKEN / TOKEN_EXPIRED |

## Acceptance

Full onboarding loop with `curl`: admin creates a student → student logs in
with the returned OTP → `/users/me` shows the profile.
