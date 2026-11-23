import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/v1/noticehub/notices/[id]/doubts/route";
import { PATCH, DELETE } from "@/app/api/v1/noticehub/doubts/[id]/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeAdmin, makeStaff, makeUser } from "@/tests/helpers";

async function makeNotice(publisher: Awaited<ReturnType<typeof makeStaff>>, overrides: { status?: "active" | "archived"; publishAt?: Date | null } = {}) {
  return prisma.notice.create({ data: { id: `NTC-${Math.random().toString(16).slice(2, 10).toUpperCase()}`, title: "Test notice", body: "A notice body", publishedBy: publisher.emailId, sortAt: new Date(), ...overrides } });
}
function routeUrl(id: string, query = "") { return `http://localhost/api/v1/noticehub/notices/${id}/doubts${query}`; }
function doubtUrl(id: string) { return `http://localhost/api/v1/noticehub/doubts/${id}`; }

describe("notice doubts", () => {
  it("lets the asker edit unanswered questions and rejects answered or invalid edits", async () => {
    const publisher = await makeStaff(); const notice = await makeNotice(publisher); const asker = await makeUser(); const other = await makeUser({ emailId: "other@example.edu" }); const admin = await makeAdmin();
    const doubt = await prisma.doubt.create({ data: { id: "DBT-10000001", noticeId: notice.id, askerId: asker.emailId, question: "Original question", createdAt: new Date(Date.now() - 10_000) } });
    const before = doubt.updatedAt;
    const edited = await PATCH(new Request(doubtUrl(doubt.id), { method: "PATCH", headers: { ...await authHeader(asker), "content-type": "application/json" }, body: JSON.stringify({ question: "  Revised question  " }) }));
    const result = await edited.json(); expect(edited.status).toBe(200); expect(result.question).toBe("Revised question"); expect(new Date(result.updated_at).getTime()).toBeGreaterThan(before.getTime());
    for (const body of [{ question: "four" }, {}]) {
      const response = await PATCH(new Request(doubtUrl(doubt.id), { method: "PATCH", headers: { ...await authHeader(asker), "content-type": "application/json" }, body: JSON.stringify(body) })); expect(response.status).toBe(422); expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    }
    const responder = await makeStaff({ emailId: "answerer@example.edu" }); await prisma.doubtResponse.create({ data: { doubtId: doubt.id, message: "Already answered", respondedBy: responder.emailId } });
    const answered = await PATCH(new Request(doubtUrl(doubt.id), { method: "PATCH", headers: { ...await authHeader(asker), "content-type": "application/json" }, body: JSON.stringify({ question: "Another question" }) })); expect(answered.status).toBe(409); expect((await answered.json()).error.code).toBe("DOUBT_ANSWERED");
    const unchanged = await prisma.doubt.findUniqueOrThrow({ where: { id: doubt.id } }); expect(unchanged.question).toBe("Revised question");
    const notOwner = await PATCH(new Request(doubtUrl(doubt.id), { method: "PATCH", headers: { ...await authHeader(other), "content-type": "application/json" }, body: JSON.stringify({ question: "An attempted edit" }) })); expect(notOwner.status).toBe(404); expect((await notOwner.json()).error.code).toBe("NOT_FOUND");
    const publisherDenied = await PATCH(new Request(doubtUrl(doubt.id), { method: "PATCH", headers: { ...await authHeader(publisher), "content-type": "application/json" }, body: JSON.stringify({ question: "Publisher edit" }) })); expect(publisherDenied.status).toBe(404); expect((await publisherDenied.json()).error.code).toBe("NOT_FOUND");
    const adminDenied = await PATCH(new Request(doubtUrl(doubt.id), { method: "PATCH", headers: { ...await authHeader(admin), "content-type": "application/json" }, body: JSON.stringify({ question: "An admin edit" }) })); expect(adminDenied.status).toBe(403); expect((await adminDenied.json()).error.code).toBe("FORBIDDEN");
    const wrongKind = await DELETE(new Request(doubtUrl("NTC-12345678"), { method: "DELETE", headers: await authHeader(asker) })); expect(wrongKind.status).toBe(422); expect((await wrongKind.json()).error.code).toBe("VALIDATION_ERROR");
    const missing = await PATCH(new Request(doubtUrl("DBT-FFFFFFFF"), { method: "PATCH", headers: { ...await authHeader(asker), "content-type": "application/json" }, body: JSON.stringify({ question: "Missing doubt" }) })); expect(missing.status).toBe(404); expect((await missing.json()).error.code).toBe("NOT_FOUND");
  });

  it("lets the asker delete answered and unanswered doubts, including their answers", async () => {
    const publisher = await makeStaff(); const notice = await makeNotice(publisher); const asker = await makeUser(); const responder = await makeStaff({ emailId: "delete-responder@example.edu" }); const other = await makeUser({ emailId: "delete-other@example.edu" }); const admin = await makeAdmin();
    const open = await prisma.doubt.create({ data: { id: "DBT-20000001", noticeId: notice.id, askerId: asker.emailId, question: "Open question" } });
    const answered = await prisma.doubt.create({ data: { id: "DBT-20000002", noticeId: notice.id, askerId: asker.emailId, question: "Answered question" } });
    await prisma.doubtResponse.create({ data: { doubtId: answered.id, message: "Answer", respondedBy: responder.emailId } });
    for (const doubt of [open, answered]) {
      const response = await DELETE(new Request(doubtUrl(doubt.id), { method: "DELETE", headers: await authHeader(asker) })); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ deleted: true, id: doubt.id });
      expect(await prisma.doubt.findUnique({ where: { id: doubt.id } })).toBeNull();
      expect(await prisma.doubtResponse.findUnique({ where: { doubtId: doubt.id } })).toBeNull();
    }
    const retained = await prisma.doubt.create({ data: { id: "DBT-20000003", noticeId: notice.id, askerId: asker.emailId, question: "Retained question" } });
    const noToken = await DELETE(new Request(doubtUrl(retained.id), { method: "DELETE" })); expect(noToken.status).toBe(401); expect((await noToken.json()).error.code).toBe("UNAUTHORIZED");
    const denied = await DELETE(new Request(doubtUrl(retained.id), { method: "DELETE", headers: await authHeader(other) })); expect(denied.status).toBe(404); expect((await denied.json()).error.code).toBe("NOT_FOUND");
    const adminDenied = await DELETE(new Request(doubtUrl(retained.id), { method: "DELETE", headers: await authHeader(admin) })); expect(adminDenied.status).toBe(403); expect((await adminDenied.json()).error.code).toBe("FORBIDDEN");
    const missing = await DELETE(new Request(doubtUrl("DBT-FFFFFFFF"), { method: "DELETE", headers: await authHeader(asker) })); expect(missing.status).toBe(404); expect((await missing.json()).error.code).toBe("NOT_FOUND");
  });

  it("accepts multiple trimmed questions and returns them without asker contact details", async () => {
    const publisher = await makeStaff(); const notice = await makeNotice(publisher); const asker = await makeUser({ phoneNumber: "1234567890" });
    for (const question of ["  Why is this?  ", "Can someone clarify?"]) {
      const response = await POST(new Request(routeUrl(notice.id), { method: "POST", headers: { ...await authHeader(asker), "content-type": "application/json" }, body: JSON.stringify({ question }) }));
      const result = await response.json(); expect(response.status).toBe(201); expect(result.question).toBe(question.trim()); expect(result.response).toBeNull(); expect(result.asker).toMatchObject({ name: asker.name, role: "student" }); expect(JSON.stringify(result)).not.toContain("1234567890");
    }
    for (const question of ["four", "x".repeat(1001)]) {
      const response = await POST(new Request(routeUrl(notice.id), { method: "POST", headers: { ...await authHeader(asker), "content-type": "application/json" }, body: JSON.stringify({ question }) }));
      expect(response.status).toBe(422); expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("enforces role, visibility and active notice rules", async () => {
    const publisher = await makeStaff(); const asker = await makeUser(); const notice = await makeNotice(publisher);
    const admin = await makeAdmin();
    const denied = await POST(new Request(routeUrl(notice.id), { method: "POST", headers: { ...await authHeader(admin), "content-type": "application/json" }, body: JSON.stringify({ question: "A valid question" }) })); expect(denied.status).toBe(403); expect((await denied.json()).error.code).toBe("FORBIDDEN");
    const archived = await makeNotice(publisher, { status: "archived" });
    const closed = await POST(new Request(routeUrl(archived.id), { method: "POST", headers: { ...await authHeader(publisher), "content-type": "application/json" }, body: JSON.stringify({ question: "A valid question" }) })); expect(closed.status).toBe(409); expect((await closed.json()).error.code).toBe("NOTICE_NOT_ACTIVE");
    const scheduled = await makeNotice(publisher, { publishAt: new Date(Date.now() + 86400000) });
    const hidden = await GET(new Request(routeUrl(scheduled.id), { headers: await authHeader(asker) })); expect(hidden.status).toBe(404);
    const noToken = await GET(new Request(routeUrl(notice.id))); expect(noToken.status).toBe(401); expect((await noToken.json()).error.code).toBe("UNAUTHORIZED");
    const wrongKind = await GET(new Request(routeUrl("FND-12345678"), { headers: await authHeader(asker) })); expect(wrongKind.status).toBe(422);
  });

  it("filters answered doubts and paginates newest first", async () => {
    const publisher = await makeStaff(); const notice = await makeNotice(publisher); const asker = await makeUser(); const responder = await makeStaff({ emailId: "responder@example.edu" });
    const unanswered = await prisma.doubt.create({ data: { id: "DBT-00000001", noticeId: notice.id, askerId: asker.emailId, question: "An unanswered question" } });
    const answered = await prisma.doubt.create({ data: { id: "DBT-00000002", noticeId: notice.id, askerId: asker.emailId, question: "An answered question", createdAt: new Date(Date.now() + 1000) } });
    await prisma.doubtResponse.create({ data: { doubtId: answered.id, message: "Here is the answer", respondedBy: responder.emailId } });
    const all = await GET(new Request(routeUrl(notice.id, "?limit=1"), { headers: await authHeader(asker) })); const first = await all.json(); expect(first.items).toHaveLength(1); expect(first.items[0].response.message).toBe("Here is the answer"); expect(first.items[0].response.responded_by.name).toBe(responder.name);
    const next = await GET(new Request(routeUrl(notice.id, `?limit=1&cursor=${encodeURIComponent(first.next_cursor)}`), { headers: await authHeader(asker) })); expect((await next.json()).items[0].id).toBe(unanswered.id);
    const onlyOpen = await GET(new Request(routeUrl(notice.id, "?answered=false"), { headers: await authHeader(asker) })); expect((await onlyOpen.json()).items.map((item: { id: string }) => item.id)).toEqual([unanswered.id]);
    const onlyDone = await GET(new Request(routeUrl(notice.id, "?answered=true"), { headers: await authHeader(asker) })); expect((await onlyDone.json()).items.map((item: { id: string }) => item.id)).toEqual([answered.id]);
    const invalid = await GET(new Request(routeUrl(notice.id, "?answered=maybe"), { headers: await authHeader(asker) })); expect(invalid.status).toBe(422); expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
