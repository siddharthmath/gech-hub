import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { GET, POST } from "@/app/api/v1/findit/posts/route";
import { GET as getOne, PATCH } from "@/app/api/v1/findit/posts/[id]/route";
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

async function createPost(staff: Awaited<ReturnType<typeof makeStaff>>, options: { images?: File[]; title?: string } = {}) {
  const form = new FormData(); form.set("title", options.title ?? "Blue bottle");
  for (const image of options.images ?? []) form.append("images", image);
  const response = await post(staff, form);
  return { response, body: await response.json() as { id: string } };
}

async function patchPost(user: Awaited<ReturnType<typeof makeUser>>, id: string, body: unknown) {
  return PATCH(new Request(`http://localhost/api/v1/findit/posts/${id}`, { method: "PATCH", headers: { ...(await authHeader(user)), "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
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

describe("FindIt post detail and editing", () => {
  it("gets a post for signed-in users and validates IDs and missing posts", async () => {
    const staff = await makeStaff(); const { body } = await createPost(staff, { title: "Detailed item", images: [file("detail.png")] });
    const student = await makeUser();
    const response = await getOne(new Request(`http://localhost/api/v1/findit/posts/${body.id}`, { headers: await authHeader(student) }), { params: Promise.resolve({ id: body.id }) });
    const postBody = await response.json(); expect(response.status).toBe(200); expect(postBody.title).toBe("Detailed item"); expect(postBody.images).toHaveLength(1); expect(postBody.images[0].url).toContain("/api/files/");
    const unknown = await getOne(new Request("http://localhost/api/v1/findit/posts/FND-FFFFFFFF", { headers: await authHeader(student) }), { params: Promise.resolve({ id: "FND-FFFFFFFF" }) });
    expect(unknown.status).toBe(404); expect((await unknown.json()).error.code).toBe("NOT_FOUND");
    const wrongKind = await getOne(new Request("http://localhost/api/v1/findit/posts/CLM-12345678", { headers: await authHeader(student) }), { params: Promise.resolve({ id: "CLM-12345678" }) });
    expect(wrongKind.status).toBe(422); expect((await wrongKind.json()).error.code).toBe("VALIDATION_ERROR");
    const noToken = await getOne(new Request(`http://localhost/api/v1/findit/posts/${body.id}`), { params: Promise.resolve({ id: body.id }) });
    expect(noToken.status).toBe(401); expect((await noToken.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("edits fields and status while preserving other values, and blocks status changes for resolved posts", async () => {
    const staff = await makeStaff(); const { body } = await createPost(staff);
    const first = await patchPost(staff, body.id, { title: "Updated item", location_found: "Library" });
    const updated = await first.json(); expect(first.status).toBe(200); expect(updated.title).toBe("Updated item"); expect(updated.location_found).toBe("Library");
    expect(updated.description).toBeNull();
    expect((await (await patchPost(staff, body.id, { status: "archived" })).json()).status).toBe("archived");
    expect((await (await list(staff, "?status=archived")).json()).items.map((item: { id: string }) => item.id)).toContain(body.id);
    expect((await (await patchPost(staff, body.id, { status: "active" })).json()).status).toBe("active");
    expect((await (await list(staff)).json()).items.map((item: { id: string }) => item.id)).toContain(body.id);
    await prisma.foundPost.update({ where: { id: body.id }, data: { resolved: true, status: "archived" } });
    const forbiddenStatus = await patchPost(staff, body.id, { status: "active" });
    expect(forbiddenStatus.status).toBe(409); expect((await forbiddenStatus.json()).error.code).toBe("POST_RESOLVED");
    const allowedEdit = await patchPost(staff, body.id, { title: "Resolved but editable" });
    expect(allowedEdit.status).toBe(200); expect((await allowedEdit.json()).title).toBe("Resolved but editable");
    const invalid = await patchPost(staff, body.id, { status: "resolved" });
    expect(invalid.status).toBe(422); expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("replaces or removes images, retaining the old set after invalid uploads", async () => {
    const staff = await makeStaff();
    const { body } = await createPost(staff, { images: [file("a.png"), file("b.png"), file("c.png")] });
    const replacement = new FormData(); replacement.append("images", file("new-a.png")); replacement.append("images", file("new-b.png"));
    const replaceResponse = await PATCH(new Request(`http://localhost/api/v1/findit/posts/${body.id}`, { method: "PATCH", headers: await authHeader(staff), body: replacement }), { params: Promise.resolve({ id: body.id }) });
    expect(replaceResponse.status).toBe(200); expect((await replaceResponse.json()).images).toHaveLength(2); expect(await prisma.foundPostImage.count({ where: { postId: body.id } })).toBe(2);
    const invalid = new FormData(); invalid.append("images", file("one.png"));
    for (let i = 0; i < 5; i++) invalid.append("images", file(`${i}.png`));
    const invalidResponse = await PATCH(new Request(`http://localhost/api/v1/findit/posts/${body.id}`, { method: "PATCH", headers: await authHeader(staff), body: invalid }), { params: Promise.resolve({ id: body.id }) });
    expect(invalidResponse.status).toBe(422); expect((await invalidResponse.json()).error.code).toBe("TOO_MANY_IMAGES"); expect(await prisma.foundPostImage.count({ where: { postId: body.id } })).toBe(2);
    const tooLarge = new FormData(); tooLarge.append("images", file("large.png", new Uint8Array(6 * 1024 * 1024)));
    const largeResponse = await PATCH(new Request(`http://localhost/api/v1/findit/posts/${body.id}`, { method: "PATCH", headers: await authHeader(staff), body: tooLarge }), { params: Promise.resolve({ id: body.id }) });
    expect(largeResponse.status).toBe(422); expect((await largeResponse.json()).error.code).toBe("IMAGE_TOO_LARGE"); expect(await prisma.foundPostImage.count({ where: { postId: body.id } })).toBe(2);
    const wrongType = new FormData(); wrongType.append("images", file("fake.png", "%PDF-1.7"));
    const wrongTypeResponse = await PATCH(new Request(`http://localhost/api/v1/findit/posts/${body.id}`, { method: "PATCH", headers: await authHeader(staff), body: wrongType }), { params: Promise.resolve({ id: body.id }) });
    expect(wrongTypeResponse.status).toBe(422); expect((await wrongTypeResponse.json()).error.code).toBe("UNSUPPORTED_IMAGE_TYPE"); expect(await prisma.foundPostImage.count({ where: { postId: body.id } })).toBe(2);
    const clearResponse = await patchPost(staff, body.id, { remove_images: true });
    expect((await clearResponse.json()).images).toEqual([]); expect(await prisma.foundPostImage.count({ where: { postId: body.id } })).toBe(0);
  });

  it("rejects empty edits, non-staff edits, and missing posts", async () => {
    const staff = await makeStaff(); const student = await makeUser(); const { body } = await createPost(staff);
    const empty = await patchPost(staff, body.id, {}); expect(empty.status).toBe(422); expect((await empty.json()).error.code).toBe("VALIDATION_ERROR");
    const denied = await patchPost(student, body.id, { title: "No access" }); expect(denied.status).toBe(403); expect((await denied.json()).error.code).toBe("FORBIDDEN");
    const missing = await patchPost(staff, "FND-FFFFFFFF", { title: "No post" }); expect(missing.status).toBe(404); expect((await missing.json()).error.code).toBe("NOT_FOUND");
  });
});
