import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest config for integration tests that need real filesystem + subprocess
 * access (e.g. the restic + MinIO backup integration test). This config does
 * NOT load the global test setup that mocks fs/promises and other modules.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*integration*.test.ts"],
    exclude: ["node_modules", ".next"],
    sequence: {
      concurrent: false,
    },
    fileParallelism: false,
    testTimeout: 180_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});