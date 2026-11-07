# GECHhub

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run the app
pnpm dev

# Check types
pnpm types

# Lint
pnpm lint

# Test
pnpm test

# Build for production
pnpm build
```

Open http://localhost:3000 in your browser.

---

## Features

### FindIt (mobile-first Lost & Found)
  - Browse found items gallery (paged grid)
  - Item detail with images
  - Claim items (students)
  - Staff workflows: post, edit, archive, resolve claims

### Lost Requests
  - Report lost items
  - My claims list

### Admin Panel
  - User management (separate session)

### Auth
  - Email + OTP login
  - 12-hour tokens with auto logout

---

## Project Structure
```

src/
├─ app/              # Routes and layout
├─ components/       # Presentational UI
├─ lib/api/          # API client (base URL, auth, errors)
├─ viewmodels/       # State & queries
├─ store/            # Session stores
└─ features/         # Admin screens
```
All data comes from the live backend only. No mocks.

---

## Backend readiness foundation

The existing UI remains intact. The server foundation adds Prisma ORM 7,
PostgreSQL migrations, `GET /api/health`, shared API error handling, JWT and
OTP helpers, IDs, pagination helpers, and Vitest coverage for the contract.

Keep your existing `DATABASE_URL` in `.env` and add `JWT_SECRET`. Set
`DATABASE_URL_TEST` to a different, dedicated PostgreSQL test database before
running `pnpm test`; test setup resets that database at the beginning of each
run and clears test data between files.

```bash
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma generate
pnpm types && pnpm lint && pnpm test && pnpm build
pnpm start
```

---

## License

- MIT
