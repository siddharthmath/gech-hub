import { describe, expect, it } from "vitest";
import { DELETE, GET, PATCH, POST } from "@/app/api/v1/findit/posts/[id]/resolution/route";
import { PATCH as PATCH_POST } from "@/app/api/v1/findit/posts/[id]/route";
import { DELETE as DELETE_CLAIM } from "@/app/api/v1/findit/claims/[id]/route";
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

async function request(method: "GET" | "POST" | "PATCH" | "DELETE", id: string, user?: Awaited<ReturnType<typeof makeUser>>, body?: unknown) {
  const handler = { GET, POST, PATCH, DELETE }[method];
  return handler(new Request(`http://localhost/api/v1/findit/posts/${id}/resolution`, {
    method,
    headers: { ...(user ? await authHeader(user) : {}), ...(["POST", "PATCH"].includes(method) ? { "content-type": "application/json" } : {}) },
    ...(["POST", "PATCH"].includes(method) ? { body: JSON.stringify(body) } : {}),
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

  it("changes the winner or note and clears a note with null", async () => {
    const staff = await makeStaff(); const firstUser = await makeUser({ emailId: "first@example.edu" }); const secondUser = await makeUser({ emailId: "second@example.edu" });
    const post = await makePost(staff); const first = await claim(post.id, firstUser.emailId); const second = await claim(post.id, secondUser.emailId);
    await request("POST", post.id, staff, { claim_id: first.id, note: "Initial" });
    const switched = await request("PATCH", post.id, staff, { claim_id: second.id });
    expect(switched.status).toBe(200); expect(await switched.json()).toMatchObject({ claim_id: second.id, claimant: { email_id: secondUser.emailId }, note: "Initial" });
    expect(await prisma.claim.findUnique({ where: { id: first.id }, select: { decision: true } })).toEqual({ decision: "rejected" });
    expect(await prisma.claim.findUnique({ where: { id: second.id }, select: { decision: true } })).toEqual({ decision: "approved" });
    await request("PATCH", post.id, staff, { note: "Updated" });
    expect(await prisma.claim.findMany({ where: { postId: post.id }, select: { decision: true } })).toEqual([{ decision: "rejected" }, { decision: "approved" }]);
    expect((await (await request("PATCH", post.id, staff, { note: null })).json()).note).toBeNull();
  });

  it("validates patches and restricts patching to staff with an existing resolution", async () => {
    const staff = await makeStaff(); const student = await makeUser(); const post = await makePost(staff); const other = await makePost(staff);
    const own = await claim(post.id, student.emailId); const foreign = await claim(other.id, student.emailId);
    await request("POST", post.id, staff, { claim_id: own.id });
    for (const [body, expected] of [[{ claim_id: foreign.id }, 404], [undefined, 422]] as const) {
      const response = await request("PATCH", post.id, staff, body);
      expect(response.status).toBe(expected);
      expect((await response.json()).error.code).toBe(expected === 404 ? "NOT_FOUND" : "VALIDATION_ERROR");
    }
    const unresolved = await request("PATCH", other.id, staff, { note: "x" });
    expect(unresolved.status).toBe(404); expect((await unresolved.json()).error.code).toBe("NOT_FOUND");
    const forbidden = await request("PATCH", post.id, student, { note: "x" });
    expect(forbidden.status).toBe(403); expect((await forbidden.json()).error.code).toBe("FORBIDDEN");
  });

  it("undoes a resolution atomically and reopens claims and post workflows", async () => {
    const staff = await makeStaff(); const winner = await makeUser({ emailId: "undo-winner@example.edu" }); const claimant = await makeUser({ emailId: "undo-other@example.edu" });
    const post = await makePost(staff); const first = await claim(post.id, winner.emailId); await claim(post.id, claimant.emailId);
    await request("POST", post.id, staff, { claim_id: first.id });
    const deleted = await request("DELETE", post.id, staff);
    expect(deleted.status).toBe(200); expect(await deleted.json()).toMatchObject({ id: post.id, status: "active", resolved: false });
    expect(await prisma.claim.findMany({ where: { postId: post.id }, select: { decision: true } })).toEqual([{ decision: "pending" }, { decision: "pending" }]);
    expect((await request("GET", post.id, staff)).status).toBe(404);
    const auth = await authHeader(staff);
    const statusPatch = await PATCH_POST(new Request(`http://localhost/api/v1/findit/posts/${post.id}`, { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ status: "archived" }) }), { params: Promise.resolve({ id: post.id }) });
    expect(statusPatch.status).toBe(200);
    const reopen = await PATCH_POST(new Request(`http://localhost/api/v1/findit/posts/${post.id}`, { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ status: "active" }) }), { params: Promise.resolve({ id: post.id }) });
    expect(reopen.status).toBe(200);
    const withdraw = await DELETE_CLAIM(new Request(`http://localhost/api/v1/findit/claims/${first.id}`, { method: "DELETE", headers: await authHeader(winner) }), { params: Promise.resolve({ id: first.id }) });
    expect(withdraw.status).toBe(200);
    expect((await request("POST", post.id, staff, { claim_id: first.id })).status).toBe(201);
  });

  it("returns the specified auth and unresolved errors for undo", async () => {
    const staff = await makeStaff(); const student = await makeUser(); const post = await makePost(staff);
    const noToken = await request("DELETE", post.id);
    expect(noToken.status).toBe(401); expect((await noToken.json()).error.code).toBe("UNAUTHORIZED");
    const forbidden = await request("DELETE", post.id, student);
    expect(forbidden.status).toBe(403); expect((await forbidden.json()).error.code).toBe("FORBIDDEN");
    const unresolved = await request("DELETE", post.id, staff);
    expect(unresolved.status).toBe(404); expect((await unresolved.json()).error.code).toBe("NOT_FOUND");
  });
});
