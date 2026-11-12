import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/v1/findit/lost-requests/route";
import { PATCH, DELETE } from "@/app/api/v1/findit/lost-requests/[id]/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeAdmin, makeStaff, makeUser } from "@/tests/helpers";

async function postLostRequest(user: Awaited<ReturnType<typeof makeUser>> | null, body: unknown) {
  return POST(new Request("http://localhost/api/v1/findit/lost-requests", {
    method: "POST",
    headers: { ...(user ? await authHeader(user) : {}), "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

async function getLostRequests(user: Awaited<ReturnType<typeof makeUser>>, query = "") {
  return GET(new Request(`http://localhost/api/v1/findit/lost-requests${query}`, { headers: await authHeader(user) }));
}

async function patchLostRequest(user: Awaited<ReturnType<typeof makeUser>> | null, id: string, body: unknown) {
  return PATCH(new Request(`http://localhost/api/v1/findit/lost-requests/${id}`, {
    method: "PATCH",
    headers: { ...(user ? await authHeader(user) : {}), "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
}

async function deleteLostRequest(user: Awaited<ReturnType<typeof makeUser>> | null, id: string) {
  return DELETE(new Request(`http://localhost/api/v1/findit/lost-requests/${id}`, {
    method: "DELETE",
    headers: user ? await authHeader(user) : {},
  }), { params: Promise.resolve({ id }) });
}

async function createReport(requesterId: string, title: string, createdAt: Date, status: "active" | "archived" = "active") {
  return prisma.lostRequest.create({
    data: {
      id: `LST-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      requesterId,
      title,
      status,
      createdAt,
    },
  });
}

describe("FindIt lost requests collection", () => {
  it("creates a report with optional details and returns its requester", async () => {
    const student = await makeUser({ phoneNumber: "1234567890" });
    const response = await postLostRequest(student, {
      title: "Blue water bottle",
      description: "Left near the library",
      location_lost: "Library, first floor",
      lost_on: "2026-11-10",
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      id: expect.stringMatching(/^LST-[A-F0-9]{8}$/),
      title: "Blue water bottle",
      description: "Left near the library",
      location_lost: "Library, first floor",
      lost_on: "2026-11-10",
      status: "active",
      requester: { email_id: student.emailId, name: student.name, role: "student", phone_number: "1234567890" },
    });

    const titleOnly = await postLostRequest(student, { title: "Lost umbrella" });
    expect(titleOnly.status).toBe(201);
    expect(await titleOnly.json()).toMatchObject({ description: null, location_lost: null, lost_on: null, status: "active" });
  });

  it("allows faculty and office staff to report lost items but rejects admins and anonymous callers", async () => {
    for (const user of [
      await makeUser({ emailId: "faculty@example.edu", role: "faculty" }),
      await makeStaff(),
    ]) {
      expect((await postLostRequest(user, { title: "Lost notebook" })).status).toBe(201);
    }

    const adminResponse = await postLostRequest(await makeAdmin(), { title: "Lost notebook" });
    expect(adminResponse.status).toBe(403);
    expect((await adminResponse.json()).error.code).toBe("FORBIDDEN");
    const anonymousResponse = await postLostRequest(null, { title: "Lost notebook" });
    expect(anonymousResponse.status).toBe(401);
    expect((await anonymousResponse.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("validates the body fields and rejects future dates", async () => {
    const student = await makeUser();
    for (const body of [
      { title: "ab" },
      { title: "Lost book", lost_on: "2999-01-01" },
      { title: "Lost book", lost_on: "2026-02-30" },
      { title: "Lost book", location_lost: "x" },
      { title: "Lost book", extra: true },
    ]) {
      const response = await postLostRequest(student, body);
      expect(response.status).toBe(422);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("limits students to their own reports regardless of mine and lets staff choose own or all", async () => {
    const owner = await makeUser({ emailId: "owner@example.edu" });
    const other = await makeUser({ emailId: "other@example.edu" });
    const staff = await makeStaff();
    await createReport(owner.emailId, "Owner report", new Date("2026-01-03T00:00:00.000Z"));
    await createReport(other.emailId, "Other report", new Date("2026-01-02T00:00:00.000Z"));
    await createReport(staff.emailId, "Staff report", new Date("2026-01-01T00:00:00.000Z"));

    const own = await (await getLostRequests(owner)).json();
    expect(own.items).toHaveLength(1);
    expect(own.items[0].requester.email_id).toBe(owner.emailId);
    const stillOwn = await (await getLostRequests(owner, "?mine=false")).json();
    expect(stillOwn.items).toHaveLength(1);

    const allForStaff = await (await getLostRequests(staff)).json();
    expect(allForStaff.items).toHaveLength(3);
    expect(allForStaff.items[0].requester.phone_number).toBe(staff.phoneNumber);
    const mineForStaff = await (await getLostRequests(staff, "?mine=true")).json();
    expect(mineForStaff.items).toHaveLength(1);
    expect(mineForStaff.items[0].requester.email_id).toBe(staff.emailId);
  });

  it("filters status, validates query values, and paginates newest first", async () => {
    const staff = await makeStaff();
    const created = [
      await createReport(staff.emailId, "Old active", new Date("2026-01-01T00:00:00.000Z")),
      await createReport(staff.emailId, "Middle active", new Date("2026-01-02T00:00:00.000Z")),
      await createReport(staff.emailId, "New active", new Date("2026-01-03T00:00:00.000Z")),
    ];
    await createReport(staff.emailId, "Archived report", new Date("2026-01-04T00:00:00.000Z"), "archived");
    const archived = await (await getLostRequests(staff, "?status=archived")).json();
    expect(archived.items).toHaveLength(1);
    expect(archived.items[0].title).toBe("Archived report");

    const first = await (await getLostRequests(staff, "?limit=1")).json();
    expect(first.items[0].id).toBe(created[2].id);
    expect(first.next_cursor).toBeTruthy();
    const second = await (await getLostRequests(staff, `?limit=1&cursor=${encodeURIComponent(first.next_cursor)}`)).json();
    const third = await (await getLostRequests(staff, `?limit=1&cursor=${encodeURIComponent(second.next_cursor)}`)).json();
    expect([first.items[0].id, second.items[0].id, third.items[0].id]).toEqual([created[2].id, created[1].id, created[0].id]);
    expect(new Set([first.items[0].id, second.items[0].id, third.items[0].id]).size).toBe(3);

    for (const query of ["?status=bogus", "?mine=yes", "?limit=0"]) {
      const response = await getLostRequests(staff, query);
      expect(response.status).toBe(422);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    }
    const adminResponse = await GET(new Request("http://localhost/api/v1/findit/lost-requests", { headers: await authHeader(await makeAdmin()) }));
    expect(adminResponse.status).toBe(403);
    expect((await adminResponse.json()).error.code).toBe("FORBIDDEN");
  });

  it("requires authentication for list access", async () => {
    const response = await GET(new Request("http://localhost/api/v1/findit/lost-requests"));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("lets an owner edit fields, archive, and reactivate their report", async () => {
    const owner = await makeUser();
    const row = await createReport(owner.emailId, "Original title", new Date("2026-01-03T00:00:00.000Z"));
    await prisma.lostRequest.update({ where: { id: row.id }, data: { description: "Description", locationLost: "Library", lostOn: new Date("2026-01-02T00:00:00.000Z") } });

    const edit = await patchLostRequest(owner, row.id, { title: "Updated title" });
    expect(edit.status).toBe(200);
    expect(await edit.json()).toMatchObject({ title: "Updated title", description: "Description", location_lost: "Library", lost_on: "2026-01-02", status: "active" });

    const archived = await patchLostRequest(owner, row.id, { status: "archived" });
    expect(archived.status).toBe(200);
    const archivedList = await (await getLostRequests(owner, "?status=archived")).json();
    expect(archivedList.items.map((item: { id: string }) => item.id)).toContain(row.id);

    const active = await patchLostRequest(owner, row.id, { status: "active" });
    expect(active.status).toBe(200);
    expect((await active.json()).status).toBe("active");
  });

  it("validates lost request patches", async () => {
    const owner = await makeUser();
    const row = await createReport(owner.emailId, "Original title", new Date("2026-01-03T00:00:00.000Z"));
    for (const body of [{ status: "resolved" }, { lost_on: "2999-01-01" }, { title: "ab" }, {}]) {
      const response = await patchLostRequest(owner, row.id, body);
      expect(response.status).toBe(422);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("hides other owners' reports from student and staff edits", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const staff = await makeStaff();
    const row = await createReport(owner.emailId, "Owner report", new Date("2026-01-03T00:00:00.000Z"));
    for (const caller of [other, staff]) {
      const response = await patchLostRequest(caller, row.id, { title: "Changed title" });
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    }
    expect((await prisma.lostRequest.findUniqueOrThrow({ where: { id: row.id } })).title).toBe("Owner report");
  });

  it("enforces patch authentication, role, and id validation", async () => {
    const owner = await makeUser();
    const row = await createReport(owner.emailId, "Owner report", new Date("2026-01-03T00:00:00.000Z"));
    const admin = await patchLostRequest(await makeAdmin(), row.id, { title: "Changed" });
    expect(admin.status).toBe(403);
    expect((await admin.json()).error.code).toBe("FORBIDDEN");
    const anonymous = await patchLostRequest(null, row.id, { title: "Changed" });
    expect(anonymous.status).toBe(401);
    expect((await anonymous.json()).error.code).toBe("UNAUTHORIZED");
    for (const [id, status] of [["LST-FFFFFFFF", 404], ["FND-FFFFFFFF", 422]] as const) {
      const response = await patchLostRequest(owner, id, { title: "Changed" });
      expect(response.status).toBe(status);
    }
  });

  it("lets only the owner delete a report", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const staff = await makeStaff();
    const row = await createReport(owner.emailId, "Owner report", new Date("2026-01-03T00:00:00.000Z"));
    for (const caller of [other, staff]) {
      const response = await deleteLostRequest(caller, row.id);
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
      expect(await prisma.lostRequest.findUnique({ where: { id: row.id } })).not.toBeNull();
    }
    const deleted = await deleteLostRequest(owner, row.id);
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toMatchObject({ deleted: true, id: row.id });
    expect(await prisma.lostRequest.findUnique({ where: { id: row.id } })).toBeNull();
    expect((await (await getLostRequests(owner)).json()).items).toHaveLength(0);
  });

  it("enforces delete authentication, role, and id validation", async () => {
    const owner = await makeUser();
    const row = await createReport(owner.emailId, "Owner report", new Date("2026-01-03T00:00:00.000Z"));
    const admin = await deleteLostRequest(await makeAdmin(), row.id);
    expect(admin.status).toBe(403);
    expect((await admin.json()).error.code).toBe("FORBIDDEN");
    const anonymous = await deleteLostRequest(null, row.id);
    expect(anonymous.status).toBe(401);
    expect((await anonymous.json()).error.code).toBe("UNAUTHORIZED");
    for (const [id, status] of [["LST-FFFFFFFF", 404], ["FND-FFFFFFFF", 422]] as const) {
      const response = await deleteLostRequest(owner, id);
      expect(response.status).toBe(status);
    }
  });
});
