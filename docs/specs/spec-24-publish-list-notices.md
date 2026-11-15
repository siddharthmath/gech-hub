# Spec 24 — Publish and browse notices

## Goal

Admin, faculty and office staff publish notices (optionally pinned, scheduled or
with a file). Everyone browses the feed.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/noticehub/notices` | admin, faculty, office_staff |
| GET | `/api/v1/noticehub/notices?status=&pinned=&cursor=&limit=` | any signed-in user |

## Backend lane

**Data (new migration)**

    enum NoticeStatus { active archived }          // "scheduled" is derived
    model Notice {
      id             String   @id                  // NTC-XXXXXXXX
      title          String
      body           String
      pinned         Boolean  @default(false)
      status         NoticeStatus @default(active)
      publishAt      DateTime? @map("publish_at")
      sortAt         DateTime  @map("sort_at")     // publish_at ?? created_at
      attachmentKey  String?  @map("attachment_key")
      attachmentName String?  @map("attachment_name")
      attachmentType String?  @map("attachment_type")
      attachmentSize Int?     @map("attachment_size")
      publishedBy    String   @map("published_by")
      publisher      User     @relation(fields: [publishedBy], references: [emailId], onDelete: Restrict)
      createdAt      DateTime @default(now()) @map("created_at")
      updatedAt      DateTime @updatedAt @map("updated_at")
      @@index([status, sortAt, id])
      @@index([publishedBy, status, sortAt, id])
    }

Reuse spec 15's image checks as `core/uploads.ts` `validateFile(file, { types,
maxBytes })` (move them there if they live in the posts module; behaviour
unchanged). Services read `new Date()` per request, never at import time.

**POST** `multipart/form-data`: `title`* (3–150), `body`* (3–5000), `pinned`
(`true`/`false`), `publish_at`, `attachment` (one file). Student → 403 FORBIDDEN.
`publish_at` rules in the index. Attachment errors: over 10MB → 422
ATTACHMENT_TOO_LARGE; other type → 422 UNSUPPORTED_ATTACHMENT_TYPE. Validate
everything before storing the file. `sort_at` = `publish_at` or now. Success →
**201** notice object (`status` derived: `scheduled` if `publish_at` is future).

**GET** `status` = `active` (default), `scheduled` or `archived`, else 422.
`pinned` = `true` / `false` filters; omitted returns both. Derived filters:
active = stored active and (no `publish_at` or it has passed); scheduled = stored
active and `publish_at` in the future; archived = stored archived. Scheduled and
archived return only the caller's own notices (admin: all). Order
`sort_at desc, id desc`; shared cursor helper; attachment `url` freshly signed.

## UI lane

Files: `app/(app)/noticehub/page.tsx`, `src/components/notices/{notice-card,
notice-status-badge,pinned-strip,feed-tabs,composer-dialog,attachment-dropzone,
schedule-picker}.tsx`, `src/viewmodels/use-notices.ts`, types and endpoint
functions in `src/lib/api/`. Query key `['notices', status, pinned]`.

**Flow:** open feed → pinned strip (`pinned=true`) over a "Latest" list
(`pinned=false`) with Load more → publishers see **+ New notice** → composer
(bottom sheet on mobile, dialog on desktop): title, body with counter,
attachment dropzone (client checks type and 10MB, per-file error), Pin toggle,
**Publish now | Schedule** switch (datetime input labelled IST, minimum = now +
1 minute) → toast "Notice published" or "Scheduled for 20 Nov, 9:00 AM IST".
Tabs: **Active** for all; **Scheduled** and **Archived** only for roles that can
publish. Empty state names the next step; skeletons match the cards.

## Tests

| Layer | Case | Expect |
|---|---|---|
| POST | faculty, title + body | 201, active, `attachment: null`, pinned false |
| POST | staff, pinned + PDF 2MB | 201, `attachment.file_name` set, file stored |
| POST | `publish_at=2026-11-20T09:00:00` (no zone) | stored as 03:30Z, status scheduled |
| POST | `publish_at` with `Z` | respected; past value → 422 VALIDATION_ERROR |
| POST | 11MB / `.exe` renamed `.pdf` | 422 ATTACHMENT_TOO_LARGE / UNSUPPORTED_ATTACHMENT_TYPE, nothing stored |
| POST | title 2 chars / missing body | 422 VALIDATION_ERROR |
| POST | admin token ok; student 403; no token 401 | as stated |
| GET | default | live notices only, newest first |
| GET | scheduled notice after `vi.setSystemTime` past its time | appears in active, not scheduled |
| GET | `status=scheduled` as publisher / as student | own list / `items: []` |
| GET | `status=archived` as admin | all archived |
| GET | `pinned=true` | pinned only; `status=bogus` → 422 |
| GET | `limit=1` paging | each notice exactly once |
| UI | feed with pinned + normal fixtures | strip above list; badge text visible |
| UI | student session | no New notice button, no Scheduled/Archived tabs |
| UI | composer: 11MB file | blocked with message, form not submitted |
| UI | composer: schedule in the past | field error, no request |
| UI | submit success | request carries `publish_at` without zone; toast shown; feed refetches |

## Acceptance

Faculty posts a pinned notice with a PDF and schedules another for tomorrow; a
student sees the first at the top of the feed and never sees the second.
