import { afterEach } from "vitest";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run database tests.");
}

afterEach(async () => {
  const { prisma } = await import("@/src/lib/prisma");
  await prisma.loginAttempt.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.lostRequest.deleteMany();
  await prisma.foundPost.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
});
