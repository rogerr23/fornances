import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

// O drizzle-kit roda fora do Next, então carregamos o .env na mão (recurso nativo do Node).
if (existsSync(".env")) process.loadEnvFile(".env");

const urlDireta = process.env.DATABASE_URL_UNPOOLED;
if (!urlDireta) {
  throw new Error("DATABASE_URL_UNPOOLED não definida. Copie .env.example para .env e preencha.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations usam a conexão direta (sem pooler), como recomenda o Neon.
  dbCredentials: { url: urlDireta },
  strict: true,
  verbose: true,
});
