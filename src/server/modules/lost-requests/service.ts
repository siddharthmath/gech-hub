import { getPage } from "@/src/lib/pagination";
import { createLostRequest as insertLostRequest, deleteOwnedLostRequest, listLostRequests as readLostRequests, updateOwnedLostRequest } from "@/src/server/modules/lost-requests/repository";
import { serializeLostRequest } from "@/src/server/modules/lost-requests/serializer";
import { createLostRequestSchema, parseLostRequestListQuery, patchLostRequestSchema } from "@/src/server/modules/lost-requests/schemas";
import { ApiError } from "@/src/lib/errors";

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

function parseLostRequestId(id: string) {
  if (!/^LST-[A-F0-9]{8}$/.test(id)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Expected an LST id.", [{ field: "id", message: "Expected an LST id." }]);
  }
  return id;
}

export async function editLostRequest(id: string, input: unknown, requesterId: string) {
  const requestId = parseLostRequestId(id);
  const data = patchLostRequestSchema.parse(input);
  const { location_lost, lost_on, ...fields } = data;
  const updated = await updateOwnedLostRequest(requestId, requesterId, {
    ...fields,
    ...(location_lost !== undefined ? { locationLost: location_lost } : {}),
    ...(lost_on !== undefined ? { lostOn: new Date(`${lost_on}T00:00:00.000Z`) } : {}),
  });
  if (!updated) throw new ApiError(404, "NOT_FOUND", "Lost request not found.");
  return serializeLostRequest(updated);
}

export async function removeLostRequest(id: string, requesterId: string) {
  const requestId = parseLostRequestId(id);
  const result = await deleteOwnedLostRequest(requestId, requesterId);
  if (result.count === 0) throw new ApiError(404, "NOT_FOUND", "Lost request not found.");
  return { deleted: true, id: requestId };
}
