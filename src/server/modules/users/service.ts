import { ApiError } from "@/src/lib/errors";
import { getPage } from "@/src/lib/pagination";
import { generateOtp } from "@/src/server/core/otp";
import { createUser, emailExists, listUsers } from "@/src/server/modules/users/repository";
import { adminUser } from "@/src/server/modules/users/serializer";
import { parseCreateUser, parseUserListQuery } from "@/src/server/modules/users/schemas";

export async function createCampusUser(input: unknown, teamId: string) {
  const data = parseCreateUser(input);
  if (await emailExists(data.email_id)) throw new ApiError(409, "ALREADY_EXISTS", "A user with this email already exists.");
  try {
    const user = await createUser({ ...data, otp: generateOtp(), teamId });
    return adminUser(user);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ApiError(409, "ALREADY_EXISTS", "A user with this email already exists.");
    }
    throw error;
  }
}

export async function getCampusUsers(query: URLSearchParams, teamId: string) {
  const options = parseUserListQuery(query);
  const rows = await listUsers({ teamId, ...options });
  const page = getPage(rows.map((user) => ({ ...user, id: user.emailId })), options.limit);
  return { items: page.items.map(adminUser), count: page.count, next_cursor: page.next_cursor };
}
