# Spec 30 — Remove an answer

## Goal

The publisher (or admin) withdraws an answer, returning the doubt to
unanswered. This is the only endpoint in this spec because it re-opens the
doubt's lifecycle.

## Endpoint

| Method | Path | Who |
|---|---|---|
| DELETE | `/api/v1/noticehub/doubts/{id}/response` | publisher of the notice, admin |

## Backend lane

No schema change. Same access rules as spec 29 (student 403; non-publisher
faculty/staff 404; admin any). Doubt has no response → 404 NOT_FOUND. Deletes the
`DoubtResponse` row. Success → 200 doubt object with `response: null`. The asker
can edit the question again, and the publisher can answer again (a new POST is a
fresh answer).

## UI lane

Files: `src/components/notices/response-actions-menu.tsx` (extends the answer
block from spec 29).

**Flow:** on the answer block the publisher's **⋯ menu** has Edit answer and
**Remove answer**. Remove confirms: "The doubt goes back to Awaiting answer." On
success the block turns back into the amber Awaiting answer pill with the Answer
button, with a toast. Readers and the asker see no menu. The doubt moves between
the Answered and Unanswered chips on the next refetch of `['doubts',
noticeId]`.

## Tests

| Layer | Case | Expect |
|---|---|---|
| DELETE | publisher removes answer | 200, `response: null`, row gone |
| DELETE | admin removes any | 200 |
| DELETE | doubt without response | 404 NOT_FOUND |
| DELETE | other faculty / student | 404 / 403 |
| DELETE | unknown / `NTC-` id; no token | 404 / 422; 401 |
| after DELETE | asker `PATCH /doubts/{id}` | 200 (editable again) |
| after DELETE | `answered=false` list | contains the doubt |
| after DELETE | new `POST .../response` | 201 (fresh answer) |
| UI | menu visibility | only the publisher |
| UI | remove | confirm first; block returns to Awaiting answer |
| UI | doubt chips | item moves from Answered to Unanswered after refetch |

## Acceptance

Remove an answer; the student can edit the question again and the doubt shows
under Unanswered.
