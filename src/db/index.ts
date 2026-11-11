import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const urlBanco = process.env.DATABASE_URL;
if (!urlBanco) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env e preencha.");
}

// Driver HTTP do Neon: cada query é uma requisição HTTP, ideal para serverless (Vercel).
export const db = drizzle({ client: neon(urlBanco), schema });
