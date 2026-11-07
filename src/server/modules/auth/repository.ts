import { prisma } from "@/src/lib/prisma";

export const findAdminByEmail = (emailId: string) => prisma.user.findFirst({ where: { emailId, role: "admin" } });
export const findUserByEmail = (emailId: string) => prisma.user.findUnique({ where: { emailId } });
export const countRecentAttempts = (key: string, since: Date) => prisma.loginAttempt.count({ where: { key, createdAt: { gte: since } } });
export const createLoginAttempt = (key: string) => prisma.loginAttempt.create({ data: { key } });
export const deleteAttemptsForKey = (key: string) => prisma.loginAttempt.deleteMany({ where: { key } });
