# Architecture

MVVM, enforced by where code lives. Layers only ever import downward.

```
app/ (routes, layout, guards)
  └─ viewmodels/ (hooks: TanStack Query + Zustand)
       └─ lib/api/ (typed client + endpoint functions + types)
            └─ GECHhub API (live, read-only truth)
components/ (presentational, imports nothing below)
```

## Directory plan

```
src/
  app/
    login/page.tsx
    (app)/layout.tsx            # auth guard + shell (nav)
    (app)/findit/page.tsx       # gallery
    (app)/findit/[postId]/page.tsx
    (app)/findit/lost-requests/page.tsx
    (app)/claims/page.tsx       # my claims
  components/
    ui/                         # shadcn primitives (add via CLI only)
    findit/PostCard.tsx, PostForm.tsx, ImageUpload.tsx,
    ClaimForm.tsx, ClaimsList.tsx, ClaimCard.tsx,
    ResolutionDialog.tsx, StatusBadge.tsx, EmptyState.tsx,
    LoadMore.tsx
    lost/LostRequestCard.tsx, LostRequestForm.tsx
  lib/api/
    client.ts                   # fetch wrapper (token, errors, base URL)
    types.ts                    # 1:1 cookbook types
    endpoints.ts                # one function per endpoint used
    errors.ts                   # ApiError class + code union
  viewmodels/
    useSession.ts               # auth store (Zustand, persist token)
    useFoundPosts.ts            # GET /posts, filters, cursor pagination
    usePost.ts                  # GET /posts/{id}
    useClaims.ts                # GET/POST/DELETE claims
    useResolution.ts            # POST/PATCH/DELETE resolution
    useLostRequests.ts          # CRUD lost requests
  stores/session.ts
```

## Data types (from the cookbook — do not extend)

```ts
type Role = 'admin' | 'student' | 'faculty' | 'office_staff';

interface Profile {
  role: Role; team_id: string; name: string; email_id: string;
  phone_number?: string; dept?: string; designation?: string; usn?: string;
}

interface FoundPost {
  post_id: string;             // FND-...
  title: string; description: string;
  location_found: string; found_on: string;   // YYYY-MM-DD
  images: { image_id: string; url: string; content_type: string }[];
  status: 'active' | 'archived';
  resolved: boolean;
  created_by: string; created_at: string; updated_at: string; // UTC
  // staff only, once resolved: resolution {claim_id, claimant_email, note, resolved_by, resolved_at}
}

interface Claim {
  claim_id: string;            // CLM-...
  post_id: string;
  claimant_email: string; claimant_name: string; claimant_role: Role;
  claimant_phone_number?: string;
  message: string;             // 10–1000 chars
  status: 'active' | 'archived';
  decision: 'pending' | 'approved' | 'rejected';
  created_at: string; updated_at: string;
}

interface LostRequest {
  request_id: string;          // LST-...
  title: string; description?: string;
  location_lost?: string; lost_on?: string;
  status: 'active' | 'archived';
  created_by: string; created_by_name: string; created_by_role: Role;
  created_by_phone_number?: string;
  created_at: string; updated_at: string;
}

interface Paged<T> { items: T[]; count: number; next_cursor: string | null; }

interface ApiError { code: string; message: string; details?: unknown; request_id?: string; }
```

## Endpoint map (complete — anything not here is out of scope)

| Function | Call | Notes |
|---|---|---|
| login | POST /api/v1/auth/login | body `{email_id, otp}` → `{access_token, expires_in, profile}` |
| me | GET /api/v1/users/me | profile refresh |
| listPosts | GET /api/v1/findit/posts?status=&cursor=&limit= | default active; archived via `?status=archived` |
| getPost | GET /api/v1/findit/posts/{post_id} | |
| createPost | POST /api/v1/findit/posts | form-data: title*, description*, location_found*, found_on*, images×≤5 |
| updatePost | PATCH /api/v1/findit/posts/{id} | form-data partial; `status` archives/reopens; `remove_images=true` |
| deletePost | DELETE /api/v1/findit/posts/{id} | staff; 409 POST_HAS_PENDING_CLAIMS |
| listClaims | GET /api/v1/findit/posts/{id}/claims | staff: all; others: own |
| myClaims | GET /api/v1/findit/claims/me?cursor= | |
| createClaim | POST /api/v1/findit/posts/{id}/claims | JSON `{message}` 10–1000; one per user per post |
| withdrawClaim | DELETE /api/v1/findit/claims/{claim_id} | pending only; 409 CLAIM_LOCKED |
| resolvePost | POST /api/v1/findit/posts/{id}/resolution | staff; `{claim_id, note?}` |
| getResolution | GET /api/v1/findit/posts/{id}/resolution | staff + approved claimant only |
| updateResolution | PATCH /api/v1/findit/posts/{id}/resolution | change claim/note |
| undoResolution | DELETE /api/v1/findit/posts/{id}/resolution | back to active, all claims pending |
| listLost | GET /api/v1/findit/lost-requests?status=&mine=&cursor= | staff default all; others own |
| createLost | POST /api/v1/findit/lost-requests | JSON `{title*, description?, location_lost?, lost_on?}` |
| updateLost | PATCH /api/v1/findit/lost-requests/{id} | owner; `status: archived/active` |
| deleteLost | DELETE /api/v1/findit/lost-requests/{id} | owner |

## Error contract

Every failure is `{error:{code,message,details}, request_id}`. UI logic branches
on `code`; `message` is shown as-is (wording may change). One handler:
401 TOKEN_EXPIRED → clear session, redirect /login; 403 FORBIDDEN → action
should have been hidden (log it); 409/422 → toast message (422 shows
`details[].field` next to the field); 429 → disable + countdown from
Retry-After.

## State rules

- Session: Zustand + persist (localStorage). Token + profile + expiry.
- Server data: TanStack Query. Query keys: `['posts', filters]`,
  `['post', id]`, `['claims', postId]`, `['myClaims']`, `['lost', filters]`.
  Mutations invalidate affected keys — never manual refetch.
- Forms: React Hook Form + Zod schemas mirroring cookbook field limits
  exactly (e.g. claim message 10–1000).
