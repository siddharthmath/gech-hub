import { getPage } from "@/src/lib/pagination";
import { createLostRequest as insertLostRequest, listLostRequests as readLostRequests } from "@/src/server/modules/lost-requests/repository";
import { serializeLostRequest } from "@/src/server/modules/lost-requests/serializer";
import { createLostRequestSchema, parseLostRequestListQuery } from "@/src/server/modules/lost-requests/schemas";

export async function createLostRequest(input: unknown, requesterId: string) {
  const data = createLostRequestSchema.parse(input);
  const request = await insertLostRequest({
    id: `LST-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
    requesterId,
    title: data.title,
    description: data.description ?? null,
    locationLost: data.location_lost ?? null,
    lostOn: data.lost_on ? new Date(`${data.lost_on}T00:00:00.000Z`) : null,
  });
  return serializeLostRequest(request);
}

export async function getLostRequests(query: URLSearchParams, user: { emailId: string; role: string }) {
  const options = parseLostRequestListQuery(query);
  const rows = await readLostRequests({ ...options, requesterId: user.emailId, role: user.role });
  const page = getPage(rows, options.limit);
  return {
    items: page.items.map(serializeLostRequest),
    count: page.count,
    next_cursor: page.next_cursor,
  };
}
