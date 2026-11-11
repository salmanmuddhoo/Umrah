import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Builds a throwaway SQLite database (prisma/test.db) with the current schema before the tests run. */
export default function setup() {
  for (const f of ["prisma/test.db", "prisma/test.db-journal"]) rmSync(f, { force: true });
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
  return () => rmSync("prisma/test.db", { force: true });
}
