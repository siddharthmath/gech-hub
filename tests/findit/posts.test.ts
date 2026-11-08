import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { GET, POST } from "@/app/api/v1/findit/posts/route";
import { GET as getFile } from "@/app/api/files/[...key]/route";
import { authHeader, makeAdmin, makeStaff, makeUser } from "@/tests/helpers";
import { prisma } from "@/src/lib/prisma";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const storageRoot = path.join(process.cwd(), ".data", "files");

function file(name: string, bytes: BlobPart = png, type = "image/png") {
  return new File([bytes], name, { type });
}

async function post(staff: Awaited<ReturnType<typeof makeStaff>>, form: FormData) {
  return POST(new Request("http://localhost/api/v1/findit/posts", { method: "POST", headers: await authHeader(staff), body: form }));
}

async function list(user: Awaited<ReturnType<typeof makeUser>>, query = "") {
  return GET(new Request(`http://localhost/api/v1/findit/posts${query}`, { headers: await authHeader(user) }));
}

describe("FindIt posts", () => {
  beforeAll(async () => mkdir(storageRoot, { recursive: true }));
  afterAll(async () => rm(path.join(storageRoot, "findit"), { recursive: true, force: true }));

  it("creates a title-only post for staff", async () => {
    const staff = await makeStaff();
    const form = new FormData(); form.set("title", "Blue bottle");
    const response = await post(staff, form); const body = await response.json();
    expect(response.status).toBe(201); expect(body.status).toBe("active"); expect(body.resolved).toBe(false); expect(body.images).toEqual([]);
  });

  it("stores up to five validated images in order and serves signed links", async () => {
    const staff = await makeStaff(); const form = new FormData(); form.set("title", "Blue bottle");
    for (let i = 0; i < 3; i++) form.append("images", file(`image-${i}.png`));
    const response = await post(staff, form); const body = await response.json();
    expect(response.status).toBe(201); expect(body.images).toHaveLength(3);
    const first = new URL(body.images[0].url, "http://localhost");
    const parts = first.pathname.split("/").slice(3).map(decodeURIComponent);
    const good = await getFile(new Request(first), { params: Promise.resolve({ key: parts }) });
    expect(good.status).toBe(200); expect(good.headers.get("content-type")).toBe("image/png");
    first.searchParams.set("signature", "0".repeat(64));
    const bad = await getFile(new Request(first), { params: Promise.resolve({ key: parts }) });
    expect(bad.status).toBe(403);
    first.searchParams.set("expires", "1");
    first.searchParams.set("signature", "0".repeat(64));
    const expired = await getFile(new Request(first), { params: Promise.resolve({ key: parts }) });
    expect(expired.status).toBe(403);
  });

  it("rejects six images before storing a row", async () => {
    const staff = await makeStaff(); const form = new FormData(); form.set("title", "Blue bottle");
    for (let i = 0; i < 6; i++) form.append("images", file(`${i}.png`));
    const response = await post(staff, form); const body = await response.json();
    expect(response.status).toBe(422); expect(body.error.code).toBe("TOO_MANY_IMAGES"); expect(await prisma.foundPost.count()).toBe(0);
  });

  it("rejects oversize and spoofed images before storing them", async () => {
    const staff = await makeStaff(); const oversized = new FormData(); oversized.set("title", "Blue bottle"); oversized.append("images", file("big.png", new Uint8Array(6 * 1024 * 1024)));
    const largeResponse = await post(staff, oversized); expect(largeResponse.status).toBe(422); expect((await largeResponse.json()).error.code).toBe("IMAGE_TOO_LARGE");
    const spoofed = new FormData(); spoofed.set("title", "Blue bottle"); spoofed.append("images", file("document.png", "%PDF-1.7", "image/png"));
    const spoofResponse = await post(staff, spoofed); expect(spoofResponse.status).toBe(422); expect((await spoofResponse.json()).error.code).toBe("UNSUPPORTED_IMAGE_TYPE");
    expect(await prisma.foundPost.count()).toBe(0);
  });

  it("validates title/date and rejects every non-staff role", async () => {
    const staff = await makeStaff(); const short = new FormData(); short.set("title", "ab");
    const shortResponse = await post(staff, short); expect(shortResponse.status).toBe(422); expect((await shortResponse.json()).error.code).toBe("VALIDATION_ERROR");
    const future = new FormData(); future.set("title", "Blue bottle"); future.set("found_on", "2999-01-01");
    expect((await post(staff, future)).status).toBe(422);
    for (const user of [await makeUser({ role: "student" }), await makeUser({ emailId: "faculty@example.edu", role: "faculty" }), await makeAdmin()]) {
      const denied = new FormData(); denied.set("title", "Blue bottle");
      const response = await post(user, denied); expect(response.status).toBe(403); expect((await response.json()).error.code).toBe("FORBIDDEN");
    }
    const noToken = await POST(new Request("http://localhost/api/v1/findit/posts", { method: "POST", body: new FormData() }));
    expect(noToken.status).toBe(401); expect((await noToken.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("lists status-filtered posts newest first with cursor pagination for signed-in roles", async () => {
    const staff = await makeStaff();
    const ids: string[] = [];
    for (const title of ["First post", "Second post", "Third post"]) {
      const form = new FormData(); form.set("title", title);
      const response = await post(staff, form); ids.push((await response.json()).id);
    }
    for (const [index, id] of ids.entries()) await prisma.foundPost.update({ where: { id }, data: { createdAt: new Date(Date.UTC(2026, 0, index + 1)) } });
    await prisma.foundPost.update({ where: { id: ids[0] }, data: { status: "archived" } });
    const student = await makeUser(); const admin = await makeAdmin();
    const firstResponse = await list(student, "?limit=2"); const first = await firstResponse.json();
    expect(firstResponse.status).toBe(200); expect(first.items.map((item: { id: string }) => item.id)).toEqual(ids.slice(1).reverse());
    const secondResponse = await list(student, `?limit=2&cursor=${encodeURIComponent(first.next_cursor)}`); const second = await secondResponse.json();
    expect([...first.items, ...second.items].map((item: { id: string }) => item.id)).toEqual(ids.slice(1).reverse());
    const archived = await (await list(admin, "?status=archived")).json(); expect(archived.items.map((item: { id: string }) => item.id)).toEqual([ids[0]]);
    const bogus = await list(student, "?status=bogus"); expect(bogus.status).toBe(422); expect((await bogus.json()).error.code).toBe("VALIDATION_ERROR");
    const noToken = await GET(new Request("http://localhost/api/v1/findit/posts")); expect(noToken.status).toBe(401);
  });
});
