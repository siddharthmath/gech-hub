import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/v1/noticehub/notices/route";
import { PATCH, DELETE } from "@/app/api/v1/noticehub/notices/[id]/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeAdmin, makeStaff, makeUser } from "@/tests/helpers";

async function publish(user: Awaited<ReturnType<typeof makeStaff>>, values: Record<string, string> = {}) {
  const form = new FormData(); form.set("title", values.title ?? "Campus notice"); form.set("body", values.body ?? "Important campus update.");
  for (const [key, value] of Object.entries(values)) if (key !== "title" && key !== "body") form.set(key, value);
  const response = await POST(new Request("http://localhost/api/v1/noticehub/notices", { method: "POST", headers: await authHeader(user), body: form }));
  return response.json();
}

async function patch(user: { emailId: string; role: string }, id: string, body: unknown) {
  return PATCH(new Request(`http://localhost/api/v1/noticehub/notices/${id}`, { method: "PATCH", headers: { ...(await authHeader(user as Awaited<ReturnType<typeof makeStaff>>)), "content-type": "application/json" }, body: JSON.stringify(body) }));
}

describe("notice edit and delete", () => {
  it("updates sent fields only and enforces publisher and student access", async () => {
    const publisher = await makeStaff(); const original = await publish(publisher, { pinned: "true" });
    const response = await patch(publisher, original.id, { title: "Updated campus notice" }); const updated = await response.json();
    expect(response.status).toBe(200); expect(updated.title).toBe("Updated campus notice"); expect(updated.body).toBe(original.body); expect(updated.pinned).toBe(true);
    const other = await makeStaff(); const hidden = await patch(other, original.id, { pinned: false }); expect(hidden.status).toBe(404); expect((await hidden.json()).error.code).toBe("NOT_FOUND");
    const student = await makeUser(); const denied = await patch(student, original.id, { pinned: false }); expect(denied.status).toBe(403); expect((await denied.json()).error.code).toBe("FORBIDDEN");
  });

  it("pins and archives/restores, then reschedules or publishes a scheduled notice", async () => {
    const publisher = await makeStaff(); const notice = await publish(publisher);
    const pinned = await patch(publisher, notice.id, { pinned: true }); expect((await pinned.json()).pinned).toBe(true);
    const archived = await patch(publisher, notice.id, { status: "archived" }); expect((await archived.json()).status).toBe("archived");
    const restored = await patch(publisher, notice.id, { status: "active" }); expect((await restored.json()).status).toBe("active");
    const scheduled = await publish(publisher, { publish_at: "2099-01-02T09:00" });
    const moved = await patch(publisher, scheduled.id, { publish_at: "2099-01-03T09:00" }); expect((await moved.json()).publish_at).toBe("2099-01-03T03:30:00.000Z");
    const live = await patch(publisher, scheduled.id, { publish_at: null }); expect((await live.json()).status).toBe("active");
    const conflict = await patch(publisher, scheduled.id, { publish_at: "2099-01-04T09:00" }); expect(conflict.status).toBe(409); expect((await conflict.json()).error.code).toBe("NOTICE_ALREADY_PUBLISHED");
  });

  it("rejects empty or invalid patch bodies and deletes for publisher or admin", async () => {
    const publisher = await makeStaff(); const notice = await publish(publisher);
    const empty = await patch(publisher, notice.id, {}); expect(empty.status).toBe(422);
    const invalid = await patch(publisher, notice.id, { status: "scheduled" }); expect(invalid.status).toBe(422);
    const other = await makeStaff(); const denied = await DELETE(new Request(`http://localhost/api/v1/noticehub/notices/${notice.id}`, { method: "DELETE", headers: await authHeader(other) })); expect(denied.status).toBe(404);
    const removed = await DELETE(new Request(`http://localhost/api/v1/noticehub/notices/${notice.id}`, { method: "DELETE", headers: await authHeader(publisher) })); expect(removed.status).toBe(200); expect(await prisma.notice.findUnique({ where: { id: notice.id } })).toBeNull();
    const admin = await makeAdmin(); const theirs = await publish(publisher); const adminDelete = await DELETE(new Request(`http://localhost/api/v1/noticehub/notices/${theirs.id}`, { method: "DELETE", headers: await authHeader(admin) })); expect(adminDelete.status).toBe(200); expect(await adminDelete.json()).toMatchObject({ deleted: true, id: theirs.id });
  });
});
