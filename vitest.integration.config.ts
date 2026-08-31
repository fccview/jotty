import { defineConfig } from "vitest/config";
import path from "path";

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