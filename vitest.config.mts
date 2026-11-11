import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Faz o alias "@/..." do tsconfig funcionar nos testes.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
  },
});
