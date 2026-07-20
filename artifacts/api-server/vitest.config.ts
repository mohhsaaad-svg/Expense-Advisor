import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The suite hits a real Postgres (the dev DB) and mints real sessions, so
    // run files sequentially against one connection pool and mark the env as
    // test (skips rate limiters + the pino-pretty worker; see app/logger).
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
    },
    // Workspace packages export raw .ts (e.g. @workspace/db → src/index.ts);
    // inline them so vitest transforms rather than tries to require them.
    server: {
      deps: {
        inline: [/@workspace\//],
      },
    },
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
