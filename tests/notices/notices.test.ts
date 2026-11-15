import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { GET, POST } from "@/app/api/v1/noticehub/notices/route";
import { GET as getFile } from "@/app/api/files/[...key]/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeAdmin, makeStaff, makeUser } from "@/tests/helpers";

const root = path.join(process.cwd(), ".data", "files");
const pdf = (size = 100) => new File([new Uint8Array([...new TextEncoder().encode("%PDF-1.7\n"), ...new Uint8Array(Math.max(size - 8, 0))])], "notice.pdf", { type: "application/pdf" });
async function submit(user: Awaited<ReturnType<typeof makeStaff>>, form: FormData) { return POST(new Request("http://localhost/api/v1/noticehub/notices", { method: "POST", headers: await authHeader(user), body: form })); }
async function list(user: Awaited<ReturnType<typeof makeStaff>>, query = "") { return GET(new Request(`http://localhost/api/v1/noticehub/notices${query}`, { headers: await authHeader(user) })); }
function form(title = "Campus update", body = "The library will open early.") { const result = new FormData(); result.set("title", title); result.set("body", body); return result; }

describe("notice publishing and browsing", () => {
  beforeAll(async () => mkdir(root, { recursive: true }));
  afterAll(async () => rm(path.join(root, "notices"), { recursive: true, force: true }));

  it("publishes for faculty and rejects students and missing tokens", async () => {
    const faculty = await makeUser({ emailId: "faculty@example.edu", role: "faculty" });
    const response = await submit(faculty, form()); const result = await response.json();
    expect(response.status).toBe(201); expect(result.status).toBe("active"); expect(result.attachment).toBeNull(); expect(result.pinned).toBe(false);
    const student = await makeUser(); const denied = await submit(student, form()); expect(denied.status).toBe(403); expect((await denied.json()).error.code).toBe("FORBIDDEN");
    const noToken = await POST(new Request("http://localhost/api/v1/noticehub/notices", { method: "POST", body: form() })); expect(noToken.status).toBe(401);
  });

  it("stores a PDF attachment and rejects oversized or spoofed uploads before storage", async () => {
    const staff = await makeStaff(); const upload = form(); upload.set("pinned", "true"); upload.set("attachment", pdf(2 * 1024 * 1024));
    const saved = await (await submit(staff, upload)).json(); expect(saved.attachment.file_name).toBe("notice.pdf"); expect(saved.pinned).toBe(true);
    const attachmentUrl = new URL(saved.attachment.url, "http://localhost"); const key = attachmentUrl.pathname.split("/").slice(3).map(decodeURIComponent);
    const served = await getFile(new Request(attachmentUrl), { params: Promise.resolve({ key }) }); expect(served.status).toBe(200); expect(served.headers.get("content-type")).toBe("application/pdf");
    const large = form(); large.set("attachment", pdf(11 * 1024 * 1024)); const largeResponse = await submit(staff, large); expect(largeResponse.status).toBe(422); expect((await largeResponse.json()).error.code).toBe("ATTACHMENT_TOO_LARGE");
    const spoof = form(); spoof.set("attachment", new File(["MZ fake"], "renamed.pdf", { type: "application/pdf" })); const spoofResponse = await submit(staff, spoof); expect(spoofResponse.status).toBe(422); expect((await spoofResponse.json()).error.code).toBe("UNSUPPORTED_ATTACHMENT_TYPE");
    expect(await prisma.notice.count()).toBe(1);
  });

  it("converts unzoned IST schedule values and returns scheduled status", async () => {
    const staff = await makeStaff(); const payload = form(); payload.set("publish_at", "2026-11-20T09:00");
    const response = await submit(staff, payload); const result = await response.json(); expect(response.status).toBe(201); expect(result.status).toBe("scheduled"); expect(result.publish_at).toBe("2026-11-20T03:30:00.000Z");
    const past = form(); past.set("publish_at", "2020-01-01T00:00Z"); const invalid = await submit(staff, past); expect(invalid.status).toBe(422); expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("validates required text and query values", async () => {
    const staff = await makeStaff(); expect((await submit(staff, form("ab"))).status).toBe(422); expect((await submit(staff, form("Valid title", ""))).status).toBe(422);
    const invalid = await list(staff, "?status=bogus"); expect(invalid.status).toBe(422); expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("filters pinned and scheduled notices to their publishers and pages by sort order", async () => {
    const author = await makeStaff(); const other = await makeUser({ emailId: "faculty@example.edu", role: "faculty" });
    for (const [title, pinned] of [["First notice", "false"], ["Pinned notice", "true"], ["Third notice", "false"]]) { const payload = form(title); payload.set("pinned", pinned); await submit(author, payload); }
    const scheduled = form("My schedule"); scheduled.set("publish_at", "2026-12-01T10:00"); await submit(author, scheduled);
    const hiddenSchedule = form("Their schedule"); hiddenSchedule.set("publish_at", "2026-12-02T10:00"); await submit(other, hiddenSchedule);
    const onlyPinned = await (await list(author, "?pinned=true")).json(); expect(onlyPinned.items.every((item: { pinned: boolean }) => item.pinned)).toBe(true);
    const first = await (await list(author, "?status=active&limit=1")).json(); const second = await (await list(author, `?status=active&limit=1&cursor=${encodeURIComponent(first.next_cursor)}`)).json(); expect(first.items[0].id).not.toBe(second.items[0].id);
    const mine = await (await list(author, "?status=scheduled")).json(); expect(mine.items.map((item: { title: string }) => item.title)).toEqual(["My schedule"]);
    expect(await (await list(other, "?status=scheduled")).json()).toMatchObject({ count: 1 });
    const student = await makeUser({ emailId: "reader@example.edu" }); expect(await (await list(student, "?status=scheduled")).json()).toMatchObject({ items: [], count: 0 });
    const admin = await makeAdmin(); const archivedForm = form("Archived"); const archived = await (await submit(author, archivedForm)).json(); await prisma.notice.update({ where: { id: archived.id }, data: { status: "archived" } });
    expect((await (await list(admin, "?status=archived")).json()).count).toBe(1);
  });
});
