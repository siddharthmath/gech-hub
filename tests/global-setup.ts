import { execFileSync } from "node:child_process";

export default function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run database tests.");
  }

  execFileSync("pnpm", ["exec", "prisma", "migrate", "reset", "--force"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
