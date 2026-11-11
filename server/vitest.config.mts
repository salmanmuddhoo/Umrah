import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": at("./src"),
      // `server-only` throws outside a Next.js server bundle; tests run in plain Node.
      "server-only": at("./test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: "./test/global-setup.ts",
    env: { DATABASE_URL: "file:./test.db", AUTH_SECRET: "test-secret-for-unit-tests-only" },
    // Service tests share one SQLite file, so files run one at a time.
    fileParallelism: false,
  },
});
