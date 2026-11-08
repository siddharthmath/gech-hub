import { ApiError } from "@/src/lib/errors";
import { getPage } from "@/src/lib/pagination";
import { generateOtp } from "@/src/server/core/otp";
import { createUser, deleteManagedUser, emailExists, findManagedUser, findUserByEmail, listUsers, updateManagedUser, updateManagedUserOtp } from "@/src/server/modules/users/repository";
import { adminUser, userProfile } from "@/src/server/modules/users/serializer";
import { parseCreateUser, parseUserListQuery, parseUserUpdate } from "@/src/server/modules/users/schemas";

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

function managedRole(role: string): role is "student" | "faculty" | "office_staff" {
  return role === "student" || role === "faculty" || role === "office_staff";
}

export async function getCampusUser(emailId: string, teamId: string) {
  const user = await findManagedUser(emailId.toLowerCase(), teamId);
  if (!user || !managedRole(user.role)) throw new ApiError(404, "NOT_FOUND", "User not found.");
  return adminUser(user);
}

export async function updateCampusUser(emailId: string, input: unknown, teamId: string) {
  const normalizedEmail = emailId.toLowerCase();
  const user = await findManagedUser(normalizedEmail, teamId);
  if (!user || !managedRole(user.role)) throw new ApiError(404, "NOT_FOUND", "User not found.");
  const data = parseUserUpdate(input, user.role);
  const updated = await updateManagedUser(normalizedEmail, teamId, data);
  return adminUser(updated);
}

export async function deleteCampusUser(emailId: string, teamId: string) {
  const normalizedEmail = emailId.toLowerCase();
  const user = await findManagedUser(normalizedEmail, teamId);
  if (!user || !managedRole(user.role)) throw new ApiError(404, "NOT_FOUND", "User not found.");
  try {
    await deleteManagedUser(normalizedEmail);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
      throw new ApiError(409, "USER_HAS_RECORDS", "This user cannot be deleted because they have related records.");
    }
    throw error;
  }
  return { deleted: true, email_id: normalizedEmail };
}

export async function regenerateCampusUserOtp(emailId: string, teamId: string) {
  const normalizedEmail = emailId.toLowerCase();
  const user = await findManagedUser(normalizedEmail, teamId);
  if (!user || !managedRole(user.role)) throw new ApiError(404, "NOT_FOUND", "User not found.");
  return adminUser(await updateManagedUserOtp(normalizedEmail, generateOtp()));
}

export async function getUserProfile(emailId: string) {
  const user = await findUserByEmail(emailId);
  if (!user || !managedRole(user.role)) throw new ApiError(404, "NOT_FOUND", "User not found.");
  return userProfile(user);
}
