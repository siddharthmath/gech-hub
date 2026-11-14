import { prisma } from "@/src/lib/prisma";
import type { CursorPosition } from "@/src/lib/pagination";

const requesterSelect = {
  emailId: true,
  name: true,
  role: true,
  phoneNumber: true,
} as const;

export function createLostRequest(data: {
  id: string;
  requesterId: string;
  title: string;
  description: string | null;
  locationLost: string | null;
  lostOn: Date | null;
}) {
  return prisma.lostRequest.create({
    data,
    include: { requester: { select: requesterSelect } },
  });
}

export function listLostRequests(input: {
  status: "active" | "archived";
  requesterId: string;
  role: string;
  mine: boolean;
  limit: number;
  cursor: CursorPosition | null;
}) {
  const ownOnly = input.role !== "office_staff" || input.mine;
  return prisma.lostRequest.findMany({
    where: {
      status: input.status,
      ...(ownOnly ? { requesterId: input.requesterId } : {}),
      ...(input.cursor ? {
        OR: [
          { createdAt: { lt: input.cursor.createdAt } },
          { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } },
        ],
      } : {}),
    },
    include: { requester: { select: requesterSelect } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
  });
}

export function updateOwnedLostRequest(id: string, requesterId: string, data: {
  title?: string;
  description?: string;
  locationLost?: string;
  lostOn?: Date;
  status?: "active" | "archived";
}) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.lostRequest.updateMany({ where: { id, requesterId }, data });
    if (result.count === 0) return null;
    return tx.lostRequest.findUnique({ where: { id }, include: { requester: { select: requesterSelect } } });
  });
}

export function deleteOwnedLostRequest(id: string, requesterId: string) {
  return prisma.lostRequest.deleteMany({ where: { id, requesterId } });
}
