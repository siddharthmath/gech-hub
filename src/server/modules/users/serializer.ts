import type { User } from "@/src/generated/prisma/client";

export function adminUser(user: User) {
  const base = {
    email_id: user.emailId,
    role: user.role,
    name: user.name,
    phone_number: user.phoneNumber,
    otp: user.otp,
    created_at: user.createdAt.toISOString(),
  };
  if (user.role === "student") return { ...base, usn: user.usn, dept: user.dept };
  if (user.role === "faculty") return { ...base, designation: user.designation };
  if (user.role === "office_staff") return { ...base, dept: user.dept, designation: user.designation };
  return base;
}
