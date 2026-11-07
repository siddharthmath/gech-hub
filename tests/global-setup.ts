import { execFileSync } from "node:child_process";

export default function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL_TEST;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL_TEST is required. Tests never use DATABASE_URL implicitly.");
  }

  const applicationDatabaseUrl = process.env.DATABASE_URL;
  if (applicationDatabaseUrl) {
    const testDatabase = new URL(databaseUrl);
    const applicationDatabase = new URL(applicationDatabaseUrl);
    if (testDatabase.host === applicationDatabase.host && testDatabase.pathname === applicationDatabase.pathname) {
      throw new Error("DATABASE_URL_TEST must point to a different PostgreSQL database from DATABASE_URL.");
    }
  }

  execFileSync("pnpm", ["exec", "prisma", "migrate", "reset", "--force"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
