# Spec 29 — Answer a doubt

## Goal

The publisher (or admin) answers each doubt once and can correct the answer.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/noticehub/doubts/{id}/response` | publisher of the notice, admin |
| PATCH | `/api/v1/noticehub/doubts/{id}/response` | publisher of the notice, admin |

## Backend lane

No schema change (uses `DoubtResponse` from spec 27). `{id}` is a `DBT-` doubt id
(else 422). Student → 403 FORBIDDEN. Doubt missing, or caller is faculty/staff
but not the notice's publisher → 404 NOT_FOUND. Admin may answer any doubt.
Answering a doubt on an archived notice is allowed.

**POST** JSON `{ message }`, trimmed, 2–2000 → else 422. A response already
exists → 409 ALREADY_EXISTS (one answer per doubt, enforced by the table's
primary key as well as the service). Stores `responded_by` = caller. Success →
**201** doubt object with `response` filled.

**PATCH** JSON `{ message }`. No response yet → 404 NOT_FOUND. Success → 200
doubt object; `responded_by` becomes the editor and `updated_at` changes while
`responded_at` stays the original answer time.

## UI lane

Files: `src/components/notices/{answer-composer,response-block}.tsx`,
`src/viewmodels/use-response-mutations.ts`.

**Flow:** under each **unanswered** doubt the publisher sees a collapsed
**Answer** button that opens an inline textarea (counter, Post answer). After
posting, the composer is replaced by the answer block (author, time in IST,
message) with **Edit answer** for the publisher. If the API says ALREADY_EXISTS
(someone else answered first), toast its message and refetch so the answer
appears. Readers see the answer block only. Students never see the composer.
Mutations invalidate `['doubts', noticeId]`.

## Tests

| Layer | Case | Expect |
|---|---|---|
| POST | publisher answers | 201, `response.message`, `responded_by` = publisher |
| POST | admin answers faculty's notice | 201 |
| POST | second answer | 409 ALREADY_EXISTS, first intact |
| POST | two concurrent answers | exactly one 201, one 409 |
| POST | 1 char / 2001 chars / missing | 422 VALIDATION_ERROR |
| POST | student | 403 FORBIDDEN |
| POST | other faculty (not publisher) | 404 NOT_FOUND |
| POST | unknown / `NTC-` id; no token | 404 / 422; 401 |
| PATCH | publisher edits | 200, new message, `responded_at` unchanged |
| PATCH | admin edits | 200, `responded_by` = admin |
| PATCH | doubt without response | 404 NOT_FOUND |
| PATCH | other faculty / student | 404 / 403 |
| after POST | asker `PATCH /doubts/{id}` | 409 DOUBT_ANSWERED |
| after POST | `answered=true` list | contains the doubt |
| UI | publisher vs reader vs student | composer only for the publisher |
| UI | post answer | composer replaced by answer block |
| UI | ALREADY_EXISTS | toast, refetch, block shown |
| UI | edit answer | PATCH `{ message }`; text updates |

## Acceptance

Faculty answers a student's doubt; it moves to Answered, the student can no
longer edit the question, and a second answer attempt is refused.
