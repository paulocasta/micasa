import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/empty.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./data/test.db", APP_PASSWORD: "", TZ: "UTC" },
    fileParallelism: false,
  },
});
