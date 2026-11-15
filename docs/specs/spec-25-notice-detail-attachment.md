# Spec 25 — Read a notice, download its file

## Goal

Open one notice and download its attachment.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/noticehub/notices/{id}` | any signed-in user |
| GET | `/api/v1/noticehub/notices/{id}/attachment` | any signed-in user |

## Backend lane

No schema change. `{id}` must be `NTC-` (else 422).

**GET /notices/{id}** → 200 notice object. Missing, or scheduled/archived and
the caller is neither the publisher nor admin → 404 NOT_FOUND.

**GET /notices/{id}/attachment** → same visibility rules, then streams the file
from `core/storage`: `Content-Type` = stored type, `Content-Disposition:
attachment; filename="<sanitised name>"`, `Cache-Control: private, no-store`.
Needs the Bearer token (the signed `url` in the notice object is only for
previews). Notice has no attachment, or the file is missing in storage → 404
NOT_FOUND. This is the only non-JSON success response.

## UI lane

Files: `app/(app)/noticehub/[noticeId]/page.tsx`, `src/components/notices/
{notice-detail,attachment-card}.tsx`, `src/viewmodels/use-notice.ts`. Add
`apiBlob` to `src/lib/api/client.ts` (token-authenticated download returning a
Blob); components never call `fetch`.

**Flow:** card tap → detail. Header: badges (Pinned, Scheduled for … IST,
Archived), title, "Name · role/dept · date in IST". Body as plain text with
preserved line breaks (never HTML). Attachment card: type icon, file name,
size, **Download** (via `apiBlob`, saved with the stored name); JPEG/PNG also
show a preview from `url`. Back link keeps the feed tab. Layout: single column;
at lg a two-column grid where the right column is reserved for doubts (spec
27). 404 shows "This notice isn't available" with a link back. Skeleton while
loading.

## Tests

| Layer | Case | Expect |
|---|---|---|
| GET | active notice, student | 200 all fields |
| GET | scheduled notice, student | 404 NOT_FOUND |
| GET | scheduled, publisher / admin | 200 |
| GET | archived, other faculty | 404 NOT_FOUND |
| GET | `FND-12345678` as id | 422 VALIDATION_ERROR |
| GET | no token | 401 UNAUTHORIZED |
| file | PDF attachment | 200, bytes equal upload, type and disposition set |
| file | file name `a"b\r\n.pdf` | header safe, no injection |
| file | no attachment / file gone from storage | 404 NOT_FOUND |
| file | scheduled notice, student | 404 NOT_FOUND |
| file | no token | 401 UNAUTHORIZED |
| UI | detail fixture | every field rendered; body shown as text, `<b>` not parsed |
| UI | Download click | `apiBlob` called with the right path; file saved |
| UI | image attachment | preview `img` uses `url` |
| UI | 404 response | not-available state with back link |

## Acceptance

Open a notice with a PDF on a phone-width screen, download it, and open the
same notice link as a student without publisher controls.
