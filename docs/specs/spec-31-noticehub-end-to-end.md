# Spec 31 — Notice Hub end to end

## Goal

Join the specs 24–30 into one working product. No new endpoints and no new
tables.

## Scope

**Navigation.** Add **Notice Hub** next to FindIt in the user shell (sidebar on
mobile and desktop), with active-route highlighting. Add a **Notices** item to the
admin shell. The admin surface reuses the same presentational components with
the **admin session scope**: admin can post notices, delete any notice and
answer any doubt, but sees no doubt form and no edit menu on others' notices. An
admin token is still never used on FindIt endpoints. View models take a `scope:
'user' | 'admin'` argument; components do not know which.

**Cross-cutting UI.** Page titles per route; a shared `scheduled` amber badge;
all times in IST; a 401 `TOKEN_EXPIRED` clears only the matching session and
returns to its login page; forbidden actions hidden for the current role.

**Backend hardening.** Confirm: every Notice Hub route wrapped in `withApi`;
every list uses the shared cursor helper; indexes exist for the three feed
queries; deleting a user with notices gives 409 USER_HAS_RECORDS while their
doubts are removed with them; files are cleaned up after deletes.

**Docs.** Apply the "Docs to update" list from the index; fill the release
checklist rows for Notice Hub.

## Tests

| Layer | Case | Expect |
|---|---|---|
| API | full lifecycle: publish → ask → answer → asker edit blocked → remove answer → edit allowed → delete notice | every step matches its spec; doubts gone at the end |
| API | scheduled notice becomes visible at `publish_at` | uses `vi.setSystemTime`, no job |
| API | role matrix in the index | one test per row (status + `error.code`) |
| API | 100 notices, `limit=25` | four pages, no duplicates or gaps |
| UI | nav | Notice Hub link in user shell, Notices link in admin shell |
| UI | admin scope | calls use the admin token; no doubt form |
| UI | expired token on a Notice Hub call | right session cleared, right login shown |
| Playwright | faculty publishes with PDF → student opens, downloads, asks → faculty answers → student sees answer | passes against `pnpm start` |
| Playwright | schedule 2 minutes ahead, wait | notice appears for the student without a reload action beyond refetch |

## Acceptance (manual, with live sessions)

1. As faculty: post a pinned notice with a PDF, a plain notice, and a scheduled
   one. As a student: pinned strip first, scheduled one absent.
2. Student asks a doubt; faculty answers; student sees the answer and cannot edit
   the question.
3. Faculty removes the answer, student edits the question, faculty answers again.
4. Faculty archives the notice: it leaves the feed, appears under their Archived
   tab, and new doubts are refused with the closed note.
5. Admin (at `/admin`) deletes the faculty's notice; it is gone for everyone.
6. At 360px, 768px and 1280px: no horizontal scroll, controls reachable, 44px
   targets, no console errors on `/noticehub` and `/noticehub/[noticeId]`.
7. `pnpm types && pnpm lint && pnpm test && pnpm build` pass.
