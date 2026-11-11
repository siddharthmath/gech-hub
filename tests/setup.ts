import { afterEach } from "vitest";
import "dotenv/config";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is required. Tests never use DATABASE_URL implicitly.");
}
process.env.DATABASE_URL = testDatabaseUrl;

afterEach(async () => {
  const { prisma } = await import("@/src/lib/prisma");
  await prisma.loginAttempt.deleteMany();
  await prisma.foundPost.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
});
