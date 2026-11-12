import type { LostRequest } from "@/src/generated/prisma/client";

type LostRequestWithRequester = LostRequest & {
  requester: {
    emailId: string;
    name: string;
    role: "admin" | "student" | "faculty" | "office_staff";
    phoneNumber: string | null;
  };
};

export function serializeLostRequest(request: LostRequestWithRequester) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    location_lost: request.locationLost,
    lost_on: request.lostOn?.toISOString().slice(0, 10) ?? null,
    status: request.status,
    requester: {
      email_id: request.requester.emailId,
      name: request.requester.name,
      role: request.requester.role,
      phone_number: request.requester.phoneNumber,
    },
    created_at: request.createdAt.toISOString(),
    updated_at: request.updatedAt.toISOString(),
  };
}
