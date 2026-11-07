# Spec 10 — Admin sign-in

## Goal

The organiser-issued admin can sign in and read their own profile.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/auth/admin/login` | public |
| GET | `/api/v1/admin/me` | admin |

## Data (first real migration)

    enum Role { admin student faculty office_staff }
    model User {
      emailId     String  @id @map("email_id")
      role        Role
      name        String
      phoneNumber String? @map("phone_number")
      usn         String?
      dept        String?
      designation String?
      otp         String           // plain text: the admin API must list OTPs
      createdAt   DateTime @default(now()) @map("created_at")
      updatedAt   DateTime @updatedAt @map("updated_at")
      @@index([role, createdAt, emailId])
    }
    model LoginAttempt {
      id        Int      @id @default(autoincrement())
      key       String
      createdAt DateTime @default(now()) @map("created_at")
      @@index([key, createdAt])
    }

`prisma/seed.ts` upserts the admin row from `ADMIN_EMAIL_ID`, `ADMIN_OTP`,
`ADMIN_NAME` (default `Administrator`). Script: `pnpm db:seed`. The admin is
never created through the API.

## Behaviour

**Core pieces added here**
- `core/auth.ts`: `signToken({sub, role, teamId, dept?})` (HS256, `expires_in`
  43200) and `requireAuth(request, { roles? })`. It reads the Bearer header,
  verifies, **loads the user from the DB**, and returns it. Missing header →
  401 UNAUTHORIZED · bad token → 401 INVALID_TOKEN · expired → 401
  TOKEN_EXPIRED · user no longer exists → 401 UNAUTHORIZED · role not in
  `roles` → 403 FORBIDDEN.
- `core/rate-limit.ts`: `assertNotLocked(key)` and `recordFailure(key)` backed
  by `LoginAttempt` (works on serverless). 5 failures in 15 minutes → 429
  RATE_LIMITED. Limits are constants in one file.

**POST /auth/admin/login** body `{ email_id, otp }`, both required strings.
Email is trimmed and lowercased. Order: validate → `assertNotLocked` → find a
user with that email **and role admin** → constant-time OTP compare. Any miss
records a failure and returns 401 INVALID_CREDENTIALS with the same message for
unknown email, non-admin email and wrong OTP. Success (reset that key's
failures) → 200
`{ access_token, expires_in: 43200, profile }`, profile =
`{ email_id, name, role: "admin" }`.

**GET /admin/me** → 200 with the same profile shape. Roles: admin only.

## Tests

| Endpoint | Case | Expect |
|---|---|---|
| login | correct email + OTP | 200, token verifies, `expires_in` 43200, role admin |
| login | wrong OTP | 401 INVALID_CREDENTIALS |
| login | unknown email | 401 INVALID_CREDENTIALS (same message as wrong OTP) |
| login | student email + their real OTP | 401 INVALID_CREDENTIALS |
| login | missing `otp` | 422 VALIDATION_ERROR, `details[0].field = "otp"` |
| login | 5 wrong tries then correct OTP | 429 RATE_LIMITED |
| login | email with capitals/spaces | succeeds (normalised) |
| me | valid admin token | 200 profile, no `otp` field |
| me | no header | 401 UNAUTHORIZED |
| me | garbage token | 401 INVALID_TOKEN |
| me | expired token | 401 TOKEN_EXPIRED |
| me | student token | 403 FORBIDDEN |
| me | token for deleted admin row | 401 UNAUTHORIZED |

## Acceptance

Seed, then log in as admin with `curl`; `/admin/me` returns the profile with
the token. Tests above pass.
