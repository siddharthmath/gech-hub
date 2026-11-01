# CampusOS FindIt UI

**Next.js 15+ frontend** for the live CampusOS FindIt (Lost & Found) backend at
`https://campus-os-backend-8sjf.onrender.com`.

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

## License

- MIT
