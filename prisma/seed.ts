import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const teamId = process.env.TEAM_ID ?? "test-team";
  const team = {
    id: teamId,
    institution: process.env.TEAM_INSTITUTION ?? "Test Institution",
    emailDomain: process.env.TEAM_EMAIL_DOMAIN ?? "example.edu",
  };
  await prisma.team.upsert({ where: { id: team.id }, create: team, update: { institution: team.institution, emailDomain: team.emailDomain } });

  const adminEmail = requiredPair("ADMIN_EMAIL_ID", "ADMIN_OTP");
  await upsertUser({ ...adminEmail, role: "admin", name: process.env.ADMIN_NAME ?? "Administrator", teamId });

  const student = optionalPair("STUDENT_EMAIL_ID", "STUDENT_OTP");
  const staff = optionalPair("STAFF_EMAIL_ID", "STAFF_OTP");
  const emails = [adminEmail.emailId, student?.emailId, staff?.emailId].filter((email): email is string => Boolean(email));
  if (new Set(emails).size !== emails.length) throw new Error("Admin, student, and staff email IDs must be distinct");

  if (student) await upsertUser({ ...student, role: "student", name: process.env.STUDENT_NAME ?? "Student", teamId });
  if (staff) {
    const role = process.env.STAFF_ROLE ?? "office_staff";
    if (role !== "faculty" && role !== "office_staff") throw new Error("STAFF_ROLE must be faculty or office_staff");
    await upsertUser({ ...staff, role, name: process.env.STAFF_NAME ?? "Staff Member", dept: process.env.STAFF_DEPT, teamId });
  }
}

function requiredPair(emailKey: string, otpKey: string) {
  const account = optionalPair(emailKey, otpKey);
  if (!account) throw new Error(`${emailKey} and ${otpKey} must be configured`);
  return account;
}

function optionalPair(emailKey: string, otpKey: string) {
  const emailId = process.env[emailKey]?.trim().toLowerCase();
  const otp = process.env[otpKey];
  if (!emailId && !otp) return null;
  if (!emailId || !otp) throw new Error(`${emailKey} and ${otpKey} must both be configured`);
  return { emailId, otp };
}

async function upsertUser(user: { emailId: string; otp: string; role: "admin" | "student" | "faculty" | "office_staff"; name: string; dept?: string; teamId: string }) {
  const data = { otp: user.otp, role: user.role, name: user.name, teamId: user.teamId, ...(user.dept ? { dept: user.dept } : {}) };
  await prisma.user.upsert({ where: { emailId: user.emailId }, create: user, update: data });
}

main().finally(() => prisma.$disconnect());
