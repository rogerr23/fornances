import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Faz o alias "@/..." do tsconfig funcionar nos testes.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    // Mesmo fuso da Vercel. Garante que a lógica de datas não depende do fuso da máquina.
    env: { TZ: "UTC" },
  },
});
