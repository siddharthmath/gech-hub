import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/v1/findit/posts/[id]/resolution/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeAdmin, makeStaff, makeUser } from "@/tests/helpers";

function context(id: string): RouteContext<"/api/v1/findit/posts/[id]/resolution"> {
  return { params: Promise.resolve({ id }) };
}

async function makePost(staff: Awaited<ReturnType<typeof makeStaff>>) {
  return prisma.foundPost.create({ data: { id: `FND-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`, title: "Blue bottle", postedBy: staff.emailId } });
}

async function claim(postId: string, claimantId: string) {
  return prisma.claim.create({ data: { id: `CLM-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`, postId, claimantId, message: "This belongs to me." } });
}

async function request(method: "GET" | "POST", id: string, user?: Awaited<ReturnType<typeof makeUser>>, body?: unknown) {
  return (method === "GET" ? GET : POST)(new Request(`http://localhost/api/v1/findit/posts/${id}/resolution`, {
    method,
    headers: { ...(user ? await authHeader(user) : {}), ...(method === "POST" ? { "content-type": "application/json" } : {}) },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  }), context(id));
}

describe("FindIt post resolutions", () => {
  it("resolves one pending claim atomically and returns its resolution", async () => {
    const staff = await makeStaff(); const winner = await makeUser({ emailId: "winner@example.edu", phoneNumber: "1234567890" });
    const other = await makeUser({ emailId: "other@example.edu" }); const post = await makePost(staff);
    const winningClaim = await claim(post.id, winner.emailId); const losingClaim = await claim(post.id, other.emailId);
    const response = await request("POST", post.id, staff, { claim_id: winningClaim.id, note: "ID verified" });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ post_id: post.id, claim_id: winningClaim.id, note: "ID verified", claimant: { email_id: winner.emailId, name: winner.name, role: "student", phone_number: winner.phoneNumber }, resolved_by: { email_id: staff.emailId, name: staff.name } });
    expect(await prisma.foundPost.findUnique({ where: { id: post.id }, select: { resolved: true, status: true } })).toEqual({ resolved: true, status: "archived" });
    expect(await prisma.claim.findUnique({ where: { id: winningClaim.id }, select: { decision: true } })).toEqual({ decision: "approved" });
    expect(await prisma.claim.findUnique({ where: { id: losingClaim.id }, select: { decision: true } })).toEqual({ decision: "rejected" });
    const second = await request("POST", post.id, staff, { claim_id: winningClaim.id });
    expect(second.status).toBe(409); expect((await second.json()).error.code).toBe("POST_RESOLVED");
    const winnerGet = await request("GET", post.id, winner); expect(winnerGet.status).toBe(200);
    const loserGet = await request("GET", post.id, other); expect(loserGet.status).toBe(404); expect((await loserGet.json()).error.code).toBe("NOT_FOUND");
  });

  it("enforces staff authorization and validation", async () => {
    const staff = await makeStaff(); const student = await makeUser(); const admin = await makeAdmin(); const post = await makePost(staff);
    const missingClaim = await request("POST", post.id, staff, {});
    expect(missingClaim.status).toBe(422); expect((await missingClaim.json()).error.code).toBe("VALIDATION_ERROR");
    for (const user of [student, admin]) {
      const forbidden = await request("POST", post.id, user, { claim_id: "CLM-AAAAAAAA" });
      expect(forbidden.status).toBe(403); expect((await forbidden.json()).error.code).toBe("FORBIDDEN");
    }
    const unauthenticated = await request("GET", post.id);
    expect(unauthenticated.status).toBe(401); expect((await unauthenticated.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("returns not found for missing posts, cross-post claims, and unresolved resolutions", async () => {
    const staff = await makeStaff(); const one = await makeUser({ emailId: "one@example.edu" }); const two = await makeUser({ emailId: "two@example.edu" });
    const post = await makePost(staff); const otherPost = await makePost(staff); const foreignClaim = await claim(otherPost.id, one.emailId);
    const missingPost = await request("POST", "FND-FFFFFFFF", staff, { claim_id: foreignClaim.id });
    expect(missingPost.status).toBe(404); expect((await missingPost.json()).error.code).toBe("NOT_FOUND");
    const crossPost = await request("POST", post.id, staff, { claim_id: foreignClaim.id });
    expect(crossPost.status).toBe(404); expect((await crossPost.json()).error.code).toBe("NOT_FOUND");
    const unknownClaim = await request("POST", post.id, staff, { claim_id: "CLM-FFFFFFFF" });
    expect(unknownClaim.status).toBe(404); expect((await unknownClaim.json()).error.code).toBe("NOT_FOUND");
    const unresolved = await request("GET", post.id, two);
    expect(unresolved.status).toBe(404); expect((await unresolved.json()).error.code).toBe("NOT_FOUND");
    await prisma.foundPost.update({ where: { id: post.id }, data: { status: "archived" } });
    const archived = await request("POST", post.id, staff, { claim_id: "CLM-FFFFFFFF" });
    expect(archived.status).toBe(409); expect((await archived.json()).error.code).toBe("POST_NOT_ACTIVE");
  });
});
