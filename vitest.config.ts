import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  resolve: {
    alias: { "@": root, "cloudflare:workers": root + "tests/d1-env.ts" },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    pool: "forks",
    maxWorkers: 2,
    testTimeout: 15000,
    reporters: ["default"],
    coverage: { include: ["lib/algorithms/**", "lib/server/**"] },
  },
});
