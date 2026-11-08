import { prisma } from "@/src/lib/prisma";
import type { Role } from "@/src/generated/prisma/client";

export async function createUser(data: {
  email_id: string; role: "student" | "faculty" | "office_staff"; name: string;
  phone_number: string; otp: string; teamId: string; usn?: string; dept?: string; designation?: string;
}) {
  return prisma.user.create({ data: {
    emailId: data.email_id, role: data.role, name: data.name, phoneNumber: data.phone_number,
    otp: data.otp, teamId: data.teamId, usn: data.usn, dept: data.dept, designation: data.designation,
  } });
}

export async function listUsers(input: {
  teamId: string; role: "student" | "faculty" | "office_staff" | null;
  limit: number; cursor: { createdAt: Date; id: string } | null;
}) {
  const where = {
    teamId: input.teamId,
    role: input.role ?? { in: ["student", "faculty", "office_staff"] as Role[] },
    ...(input.cursor ? { OR: [
      { createdAt: { lt: input.cursor.createdAt } },
      { createdAt: input.cursor.createdAt, emailId: { lt: input.cursor.id } },
    ] } : {}),
  };
  return prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }, { emailId: "desc" }], take: input.limit + 1 });
}

export function emailExists(emailId: string) {
  return prisma.user.findUnique({ where: { emailId }, select: { emailId: true } });
}

export function findManagedUser(emailId: string, teamId: string) {
  return prisma.user.findFirst({
    where: { emailId, teamId, role: { in: ["student", "faculty", "office_staff"] } },
  });
}

export function updateManagedUser(emailId: string, teamId: string, data: {
  name?: string; phone_number?: string; usn?: string; dept?: string; designation?: string;
}) {
  return prisma.user.update({
    where: { emailId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone_number !== undefined ? { phoneNumber: data.phone_number } : {}),
      ...(data.usn !== undefined ? { usn: data.usn } : {}),
      ...(data.dept !== undefined ? { dept: data.dept } : {}),
      ...(data.designation !== undefined ? { designation: data.designation } : {}),
    },
  });
}
