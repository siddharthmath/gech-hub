import type { User } from "@/src/generated/prisma/client";

export function adminProfile(user: Pick<User, "emailId" | "name" | "role">) {
  return { email_id: user.emailId, name: user.name, role: user.role };
}
