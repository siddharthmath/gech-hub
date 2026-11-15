# Notice Hub specs 24–31: index

Notice Hub (`/api/v1/noticehub`) added to the same Next.js project: Prisma +
PostgreSQL backend and its UI. Contract: the API Quick Guide, section 2. Paths,
methods, roles and field names are fixed; nothing outside the guide is added.
Rule: **one goal and 2 endpoints per spec, with the matching UI and tests.**
All paths below are under `/api/v1/noticehub`.

| Spec | Goal | Endpoints | UI delivered |
|---|---|---|---|
| 24 | Publish and browse notices | `POST /notices` · `GET /notices` | Feed, pinned strip, composer |
| 25 | Read a notice, download file | `GET /notices/{id}` · `GET /notices/{id}/attachment` | Detail page, attachment card |
| 26 | Edit, pin, archive, schedule, delete | `PATCH` · `DELETE /notices/{id}` | Publisher actions, edit dialog |
| 27 | Ask and list doubts | `POST` · `GET /notices/{id}/doubts` | Doubts panel, ask form |
| 28 | Edit or delete my doubt | `PATCH` · `DELETE /doubts/{id}` | Asker actions |
| 29 | Answer a doubt | `POST` · `PATCH /doubts/{id}/response` | Answer composer |
| 30 | Remove an answer | `DELETE /doubts/{id}/response` (one endpoint) | Remove-answer action |
| 31 | End to end | none | Nav, admin surface, Playwright, audit |

Needs specs 10 and 14 (auth, `User`), 15 (`core/storage`, file checks) and the
shared kernel from spec 00. It does not need 21 or 23.

## Who can do what

| Action | admin | faculty | office_staff | student |
|---|---|---|---|---|
| Post a notice | yes | yes | yes | 403 |
| Read active notices | yes | yes | yes | yes |
| Edit / pin / archive / schedule | own only | own | own | 403 |
| Delete a notice | **any** | own | own | 403 |
| Ask a doubt | 403 | yes | yes | yes |
| Edit / delete a doubt | 403 | own | own | own |
| Answer, edit or remove an answer | **any** | notices they published | same | 403 |

Anyone else who is not the owner gets **404** (not found or not yours).

## Contract additions (every spec)

- **IDs:** `NTC-` notice, `DBT-` doubt (`PREFIX-` + 8 uppercase hex). A response
  has no id of its own; it is addressed through its doubt.
- **Feature codes (422 unless noted):** ATTACHMENT_TOO_LARGE,
  UNSUPPORTED_ATTACHMENT_TYPE (spec 24) · NOTICE_NOT_ACTIVE 409 (27) ·
  DOUBT_ANSWERED 409 (28) · NOTICE_ALREADY_PUBLISHED 409 (26).
  A second answer reuses ALREADY_EXISTS 409.
- **Derived status:** only `active` / `archived` are stored. A notice is
  **scheduled** while `publish_at` is in the future; it goes live automatically
  when the time passes, with no job or cron (reads compare with now). Archived
  always wins.
- **publish_at:** a value with no zone (`2026-11-20T09:00:00`) is **IST**; a
  value with `Z` or an offset is respected. Stored and returned in UTC. Past or
  now → 422 VALIDATION_ERROR.
- **Order:** newest first by `sort_at` = `publish_at` or, if none, `created_at`
  (a scheduled notice rises to the top when it goes live). Cursor stays opaque.
- **Attachment:** one file, PDF/JPEG/PNG, ≤ 10MB, checked by content type and
  magic bytes. PATCH: a new file replaces it; `remove_attachment=true` deletes it.
- **Visibility:** scheduled and archived notices are visible only to their
  publisher and to admin; anyone else gets 404 by id, and an empty list for
  `status=scheduled|archived`.

## Shared fixtures (parallel development)

Save once as `tests/fixtures/noticehub.ts`. Backend serializer tests assert these
key sets; UI tests return them from MSW. Nothing else couples the two lanes.

    notice  { id, title, body, pinned, status, publish_at|null,
              attachment|null{ url, file_name, content_type, size_bytes },
              published_by{ email_id, name, role, dept? }, created_at, updated_at }
    doubt   { id, notice_id, question, asker{ email_id, name, role },
              response|null{ message, responded_by{ email_id, name, role }, responded_at },
              created_at, updated_at }

Shapes are inferred from the guide and the existing FindIt shapes; confirm in
`{baseUrl}/docs`. Each is built in one serializer, so a fix is local.

## Parallel lanes

Every spec has a **Backend lane** (migration, schemas, repository, service,
serializer, routes, DB tests) and a **UI lane** (types, endpoint functions,
view models, components, MSW tests). The lanes share only the fixtures above,
so two people can build a spec at the same time and meet at the acceptance
check. UI code never ships mock data; MSW is for tests only.

## UX principles

- Readers first: the feed answers "what's new for me" in one screen. Pinned
  notices sit on top; everything else is newest first.
- Publishers get one primary action ("New notice") and a single actions menu
  per notice. Readers never see publisher controls (hidden, not disabled).
- Mobile first: bottom sheets for forms, 44px targets, no horizontal scroll at
  360px. Desktop: feed grid, and detail with a doubts panel on the right.
- Skeletons match layout; empty states say what to do next; every mutation
  toasts; errors show the API message and branch on `error.code`.
- Every time is shown in IST; schedule inputs say "IST".
- Status is color plus text: active green, scheduled amber, archived gray,
  pinned uses the indigo accent with a label.

## Docs to update when Notice Hub ships

- `CLAUDE.md`: add `/api/v1/noticehub/*`, the `NTC-`/`DBT-` prefixes, scheduled
  = amber, and allow the **admin** session to call Notice Hub endpoints (still
  never FindIt).
- `project-doc.md` scope, `architecture.md` endpoint map, progress tracker.

## Choices made where the guide is silent

Limits: title 3–150, body 3–5000, doubt 5–1000, answer 2–2000. Visibility
rules above, 409 codes above, and admin may answer any doubt. `answered` accepts
`true` or `false`; omitted returns all.
