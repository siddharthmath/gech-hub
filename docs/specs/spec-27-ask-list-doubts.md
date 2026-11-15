# Spec 27 — Ask and list doubts

## Goal

Readers ask a question on a notice; everyone sees the questions and answers.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/noticehub/notices/{id}/doubts` | student, faculty, office_staff |
| GET | `/api/v1/noticehub/notices/{id}/doubts?answered=&cursor=&limit=` | any signed-in user |

## Backend lane

**Data (new migration)**

    model Doubt {
      id        String   @id                       // DBT-XXXXXXXX
      noticeId  String   @map("notice_id")
      notice    Notice   @relation(fields: [noticeId], references: [id], onDelete: Cascade)
      askerId   String   @map("asker_id")
      asker     User     @relation(fields: [askerId], references: [emailId], onDelete: Cascade)
      question  String
      createdAt DateTime @default(now()) @map("created_at")
      updatedAt DateTime @updatedAt @map("updated_at")
      response  DoubtResponse?
      @@index([noticeId, createdAt, id])
      @@index([askerId, createdAt, id])
    }
    model DoubtResponse {                           // table only; endpoints in spec 29
      doubtId     String   @id @map("doubt_id")
      doubt       Doubt    @relation(fields: [doubtId], references: [id], onDelete: Cascade)
      message     String
      respondedBy String   @map("responded_by")
      responder   User     @relation(fields: [respondedBy], references: [emailId], onDelete: Restrict)
      respondedAt DateTime @default(now()) @map("responded_at")
      updatedAt   DateTime @updatedAt @map("updated_at")
    }

**POST** JSON `{ question }`, trimmed, 5–1000 → else 422 VALIDATION_ERROR. Admin
→ 403 FORBIDDEN. Notice not visible to the caller → 404 NOT_FOUND. Visible but
not live (archived, or scheduled for its publisher) → 409 NOTICE_NOT_ACTIVE. No
per-user limit. Success → **201** doubt object, `response: null`.

**GET** all doubts on the notice are public to any signed-in user. `answered` =
`true` / `false` (else 422; omitted returns all). Same visibility rule as POST
(404). Newest first, shared cursor helper. Asker shows name and role only, no
phone.

## UI lane

Files: `src/components/notices/{doubts-panel,ask-doubt-form,doubt-filter-chips,
doubt-item}.tsx`, `src/viewmodels/use-doubts.ts`. Query key `['doubts',
noticeId, answered]`.

**Flow:** on the detail page the panel sits below the notice on mobile and in
the right column at lg. Top: **Ask a doubt** textarea (counter, "5+ characters")
and Send. Chips **All · Unanswered · Answered** drive `answered`. Each item: asker
name and role, time in IST, the question, then either the answer block
("Answered by Name") or an amber **Awaiting answer** pill. Load more at the end.
The form is hidden for admin; on a non-live notice it is replaced by "Doubts are
closed for this notice". Empty state: "No doubts yet. Be the first to ask."
Success toast "Doubt posted"; the new item appears first.

## Tests

| Layer | Case | Expect |
|---|---|---|
| POST | student, 12 chars | 201, `response: null`, asker fields set |
| POST | 4 chars / 1001 chars | 422 VALIDATION_ERROR |
| POST | same user asks twice | both 201 |
| POST | admin token | 403 FORBIDDEN |
| POST | archived notice | 409 NOTICE_NOT_ACTIVE |
| POST | scheduled notice, student | 404 NOT_FOUND |
| POST | unknown / wrong-kind id | 404 / 422 |
| POST | no token | 401 UNAUTHORIZED |
| GET | other student reads | sees all doubts, no asker phone |
| GET | `answered=false` / `true` (fixture response) | unanswered / answered only |
| GET | `answered=maybe` | 422 VALIDATION_ERROR |
| GET | `limit=1` paging | each doubt once |
| GET | scheduled notice, student | 404 NOT_FOUND |
| GET | answered doubt | `response` has message, responder, time |
| UI | ask with 4 chars | blocked, field highlighted |
| UI | chips | change the `answered` param; list updates |
| UI | admin session / archived notice | no form / closed note |
| UI | answered fixture | answer block and responder name shown |

## Acceptance

A student asks a question on a live notice; another student sees it under
Unanswered; on an archived notice the form is replaced by the closed note.
