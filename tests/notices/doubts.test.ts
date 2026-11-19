import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/v1/noticehub/notices/[id]/doubts/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeAdmin, makeStaff, makeUser } from "@/tests/helpers";

async function makeNotice(publisher: Awaited<ReturnType<typeof makeStaff>>, overrides: { status?: "active" | "archived"; publishAt?: Date | null } = {}) {
  return prisma.notice.create({ data: { id: `NTC-${Math.random().toString(16).slice(2, 10).toUpperCase()}`, title: "Test notice", body: "A notice body", publishedBy: publisher.emailId, sortAt: new Date(), ...overrides } });
}
function routeUrl(id: string, query = "") { return `http://localhost/api/v1/noticehub/notices/${id}/doubts${query}`; }

describe("notice doubts", () => {
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
