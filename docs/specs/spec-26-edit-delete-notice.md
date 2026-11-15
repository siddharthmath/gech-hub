# Spec 26 — Edit, pin, archive, schedule and delete

## Goal

The publisher maintains their notice; admin can delete any notice.

## Endpoints

| Method | Path | Who |
|---|---|---|
| PATCH | `/api/v1/noticehub/notices/{id}` | the publisher |
| DELETE | `/api/v1/noticehub/notices/{id}` | the publisher, admin (any) |

## Backend lane

No schema change. Student → 403 FORBIDDEN. Missing or not the caller's → 404
NOT_FOUND (admin's PATCH on someone else's notice is also 404).

**PATCH** JSON or `multipart/form-data`; only sent fields change: `title`,
`body`, `pinned`, `status` (`active` | `archived`), `publish_at`, `attachment`,
`remove_attachment=true`. Empty body → 422. `status: "scheduled"` → 422.
- Archive / restore = `status`. Pin / unpin = `pinned`.
- `publish_at` works only while the notice is **scheduled**: a future value
  reschedules (and updates `sort_at`), `null` publishes it now (`sort_at` = now);
  on a notice already live or archived → 409 NOTICE_ALREADY_PUBLISHED.
- A new `attachment` replaces the old one; the old file is removed after the DB
  commit; storage cleanup failures are logged, never returned.
- Success → 200 notice object.

**DELETE** → 200 `{ "deleted": true, "id": "NTC-..." }`. Cascades doubts and
answers; the attachment file is removed after commit. Student 403; faculty/staff
non-publisher 404; admin may delete any.

## UI lane

Files: `src/components/notices/{notice-actions-menu,notice-edit-dialog,
confirm-delete-dialog}.tsx`, `src/viewmodels/use-notice-mutations.ts`.

**Flow (publisher on their own notice):** one **⋯ menu** on the detail page and
cards: Edit, Pin/Unpin, Archive/Restore, Reschedule (only while scheduled),
Delete. Edit reuses the composer in edit mode, prefilled, with attachment
Keep / Replace / Remove. Pin and archive act at once with a toast and an
Undo-free refetch. Delete asks for confirmation and says "Doubts and answers on
this notice will also be deleted." Others never see the menu; admin sees only
Delete (admin surface, spec 31). Mutations invalidate `['notices']` and
`['notice', id]`.

## Tests

| Layer | Case | Expect |
|---|---|---|
| PATCH | publisher edits title | 200, other fields unchanged |
| PATCH | `pinned=true` then `false` | reflected; `pinned=true` filter follows |
| PATCH | `status=archived` | gone from active, in `status=archived` |
| PATCH | `status=active` on archived | back in active (or scheduled if future `publish_at`) |
| PATCH | reschedule scheduled notice | new `publish_at`, `sort_at` updated |
| PATCH | `publish_at: null` on scheduled | goes live, sorted by now |
| PATCH | `publish_at` on live notice | 409 NOTICE_ALREADY_PUBLISHED |
| PATCH | new attachment / `remove_attachment=true` | replaced / `null`; old file removed |
| PATCH | bad type / 11MB | 422 UNSUPPORTED_ATTACHMENT_TYPE / ATTACHMENT_TOO_LARGE, old file intact |
| PATCH | `status: "scheduled"`; empty body | 422 VALIDATION_ERROR |
| PATCH | other faculty / admin on others' | 404 NOT_FOUND |
| PATCH | student | 403 FORBIDDEN |
| DELETE | publisher | 200, row, doubts and file gone |
| DELETE | admin on faculty's notice | 200 |
| DELETE | other faculty / student | 404 / 403 |
| DELETE | storage `remove` throws | still 200 |
| UI | publisher vs reader | menu only for publisher; Reschedule only when scheduled |
| UI | delete confirm | request only after confirming; warning text present |
| UI | 409 NOTICE_ALREADY_PUBLISHED | toast with API message, data refetched |

## Acceptance

Publisher pins, archives, restores, reschedules and deletes a notice; a student
sees each change on the feed and cannot reach any of these actions.
