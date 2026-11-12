import "server-only";

import { criarConexao } from "./conexao";

const urlBanco = process.env.DATABASE_URL;
if (!urlBanco) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env e preencha.");
}

// Conexão usada pela aplicação (string POOLED do Neon).
export const db = criarConexao(urlBanco);
