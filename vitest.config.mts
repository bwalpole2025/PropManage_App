import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// .mts so Vite loads it as ESM. Alias "@/*" to the project root manually
// (avoids the ESM-only vite-tsconfig-paths under CJS config loading).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
