import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Cria o client do Drizzle a partir de uma URL do Neon.
// Fica separado do `index.ts` para os scripts de terminal (ex.: criar-usuario) poderem
// reaproveitar sem importar `server-only`, que só funciona dentro do Next.
export function criarConexao(urlBanco: string) {
  // Driver HTTP do Neon: cada query é uma requisição HTTP, ideal para serverless (Vercel).
  return drizzle({ client: neon(urlBanco), schema });
}

export type Banco = ReturnType<typeof criarConexao>;
