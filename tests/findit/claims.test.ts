import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/v1/findit/posts/[id]/claims/route";
import { prisma } from "@/src/lib/prisma";
import { authHeader, makeStaff, makeUser } from "@/tests/helpers";

async function makePost(staff: Awaited<ReturnType<typeof makeStaff>>) {
  return prisma.foundPost.create({ data: { id: `FND-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`, title: "Blue bottle", postedBy: staff.emailId } });
}

function context(id: string): RouteContext<"/api/v1/findit/posts/[id]/claims"> {
  return { params: Promise.resolve({ id }) };
}

async function postClaim(id: string, user: Awaited<ReturnType<typeof makeUser>>, message = "This is my bottle") {
  return POST(new Request(`http://localhost/api/v1/findit/posts/${id}/claims`, { method: "POST", headers: { ...(await authHeader(user)), "content-type": "application/json" }, body: JSON.stringify({ message }) }), context(id));
}

async function listClaims(id: string, user: Awaited<ReturnType<typeof makeUser>>, query = "") {
  return GET(new Request(`http://localhost/api/v1/findit/posts/${id}/claims${query}`, { headers: await authHeader(user) }), context(id));
}

describe("FindIt claims", () => {
  it("creates pending claims and rejects invalid messages and duplicates", async () => {
    const staff = await makeStaff(); const student = await makeUser({ phoneNumber: "1234567890" }); const post = await makePost(staff);
    const response = await postClaim(post.id, student); const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ id: expect.stringMatching(/^CLM-[A-F0-9]{8}$/), post_id: post.id, post_title: "Blue bottle", decision: "pending", claimant: { email_id: student.emailId, name: student.name, role: "student", phone_number: student.phoneNumber } });
    for (const [index, message] of ["123456789", "x".repeat(1001)].entries()) {
      const invalid = await postClaim(post.id, await makeUser({ emailId: `invalid-${index}@example.edu` }), message);
      expect(invalid.status).toBe(422); expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
    }
    const duplicate = await postClaim(post.id, student);
    expect(duplicate.status).toBe(409); expect((await duplicate.json()).error.code).toBe("ALREADY_EXISTS");
    const other = await postClaim(post.id, await makeUser({ emailId: "other@example.edu" })); expect(other.status).toBe(201);
  });

  it("rejects missing, archived, and resolved posts", async () => {
    const staff = await makeStaff(); const student = await makeUser(); const post = await makePost(staff);
    const missing = await postClaim("FND-FFFFFFFF", student); expect(missing.status).toBe(404); expect((await missing.json()).error.code).toBe("NOT_FOUND");
    await prisma.foundPost.update({ where: { id: post.id }, data: { status: "archived" } });
    let response = await postClaim(post.id, student); expect(response.status).toBe(409); expect((await response.json()).error.code).toBe("POST_NOT_ACTIVE");
    await prisma.foundPost.update({ where: { id: post.id }, data: { status: "active", resolved: true } });
    response = await postClaim(post.id, student); expect(response.status).toBe(409); expect((await response.json()).error.code).toBe("POST_NOT_ACTIVE");
  });

  it("lists all claims to staff and only the caller's claims to other roles, with pagination", async () => {
    const staff = await makeStaff(); const first = await makeUser({ emailId: "first@example.edu" }); const second = await makeUser({ emailId: "second@example.edu" }); const post = await makePost(staff);
    await postClaim(post.id, first); await postClaim(post.id, second);
    const staffFirst = await (await listClaims(post.id, staff, "?limit=1")).json();
    expect(staffFirst.items).toHaveLength(1); expect(staffFirst.next_cursor).toBeTruthy();
    const staffSecond = await (await listClaims(post.id, staff, `?limit=1&cursor=${encodeURIComponent(staffFirst.next_cursor)}`)).json();
    expect([...staffFirst.items, ...staffSecond.items]).toHaveLength(2);
    const own = await (await listClaims(post.id, first)).json(); expect(own.items).toHaveLength(1); expect(own.items[0].claimant.email_id).toBe(first.emailId);
    const empty = await (await listClaims(post.id, await makeUser({ emailId: "third@example.edu" }))).json(); expect(empty).toMatchObject({ items: [], count: 0 });
    const missing = await listClaims("FND-FFFFFFFF", first); expect(missing.status).toBe(404); expect((await missing.json()).error.code).toBe("NOT_FOUND");
  });

  it("requires authentication for both endpoints", async () => {
    const get = await GET(new Request("http://localhost/api/v1/findit/posts/FND-FFFFFFFF/claims"), context("FND-FFFFFFFF"));
    const post = await POST(new Request("http://localhost/api/v1/findit/posts/FND-FFFFFFFF/claims", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "This is my item" }) }), context("FND-FFFFFFFF"));
    for (const response of [get, post]) { expect(response.status).toBe(401); expect((await response.json()).error.code).toBe("UNAUTHORIZED"); }
  });
});
