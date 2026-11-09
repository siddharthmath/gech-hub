import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/v1/findit/claims/[id]/route";
import { GET } from "@/app/api/v1/findit/claims/me/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeStaff, makeUser } from "@/tests/helpers";

async function makePost(staff: Awaited<ReturnType<typeof makeStaff>>, title: string) {
  return prisma.foundPost.create({ data: { id: `FND-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`, title, postedBy: staff.emailId } });
}

async function createClaim(postId: string, claimantId: string, id = `CLM-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`) {
  return prisma.claim.create({ data: { id, postId, claimantId, message: "This is my item" } });
}

async function listMine(user: Awaited<ReturnType<typeof makeUser>>, query = "") {
  return GET(new Request(`http://localhost/api/v1/findit/claims/me${query}`, { headers: await authHeader(user) }));
}

async function deleteClaim(id: string, user: Awaited<ReturnType<typeof makeUser>>) {
  return DELETE(new Request(`http://localhost/api/v1/findit/claims/${id}`, { method: "DELETE", headers: await authHeader(user) }), { params: Promise.resolve({ id }) });
}

describe("my FindIt claims", () => {
  it("lists only the caller's claims across posts, newest first, with pagination", async () => {
    const staff = await makeStaff();
    const user = await makeUser({ emailId: "claims-owner@example.edu" });
    const other = await makeUser({ emailId: "claims-other@example.edu" });
    const firstPost = await makePost(staff, "First post");
    const secondPost = await makePost(staff, "Second post");
    const first = await createClaim(firstPost.id, user.emailId);
    const second = await createClaim(secondPost.id, user.emailId);
    await createClaim(firstPost.id, other.emailId);
    await prisma.claim.update({ where: { id: first.id }, data: { createdAt: new Date("2025-01-01T00:00:00Z") } });
    await prisma.claim.update({ where: { id: second.id }, data: { createdAt: new Date("2025-01-02T00:00:00Z") } });

    const firstPageResponse = await listMine(user, "?limit=1");
    const firstPage = await firstPageResponse.json();
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0]).toMatchObject({ id: second.id, post_title: "Second post", decision: "pending" });
    expect(firstPage.next_cursor).toBeTruthy();
    const secondPage = await (await listMine(user, `?limit=1&cursor=${encodeURIComponent(firstPage.next_cursor)}`)).json();
    expect([...firstPage.items, ...secondPage.items].map((item: { id: string }) => item.id)).toEqual([second.id, first.id]);
    expect(secondPage.next_cursor).toBeNull();
  });

  it("returns an empty list when the caller has no claims and requires a token", async () => {
    const user = await makeUser({ emailId: "claims-empty@example.edu" });
    expect(await (await listMine(user)).json()).toMatchObject({ items: [], count: 0, next_cursor: null });
    const response = await GET(new Request("http://localhost/api/v1/findit/claims/me"));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("lets only the claimant withdraw pending claims", async () => {
    const staff = await makeStaff();
    const owner = await makeUser({ emailId: "withdraw-owner@example.edu" });
    const other = await makeUser({ emailId: "withdraw-other@example.edu" });
    const post = await makePost(staff, "Withdraw test");
    const claim = await createClaim(post.id, owner.emailId);

    const denied = await deleteClaim(claim.id, other);
    expect(denied.status).toBe(404);
    expect((await denied.json()).error.code).toBe("NOT_FOUND");
    const removed = await deleteClaim(claim.id, owner);
    expect(removed.status).toBe(200);
    expect(await removed.json()).toMatchObject({ deleted: true, id: claim.id });
    expect(await prisma.claim.findUnique({ where: { id: claim.id } })).toBeNull();
    expect((await (await listMine(owner)).json()).items).toEqual([]);
    await createClaim(post.id, owner.emailId);
  });

  it("hides a student's claim from staff and returns locked for decided claims", async () => {
    const staff = await makeStaff();
    const student = await makeUser({ emailId: "withdraw-student@example.edu" });
    const post = await makePost(staff, "Locked claims");
    const approved = await createClaim(post.id, student.emailId);
    const rejected = await createClaim((await makePost(staff, "Rejected claim")).id, student.emailId);
    await prisma.claim.update({ where: { id: approved.id }, data: { decision: "approved" } });
    await prisma.claim.update({ where: { id: rejected.id }, data: { decision: "rejected" } });
    for (const user of [staff, await makeUser({ emailId: "admin@example.edu", role: "admin" })]) {
      const response = await deleteClaim(approved.id, user);
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    }
    for (const claim of [approved, rejected]) {
      const response = await deleteClaim(claim.id, student);
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("CLAIM_LOCKED");
    }
    const missing = await deleteClaim("CLM-FFFFFFFF", student);
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("NOT_FOUND");
    const invalid = await deleteClaim("FND-12345678", student);
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication to withdraw", async () => {
    const response = await DELETE(new Request("http://localhost/api/v1/findit/claims/CLM-FFFFFFFF", { method: "DELETE" }), { params: Promise.resolve({ id: "CLM-FFFFFFFF" }) });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });
});
