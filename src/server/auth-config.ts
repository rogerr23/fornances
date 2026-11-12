import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import type { Banco } from "@/db/conexao";
import * as schema from "@/db/schema";

const UM_DIA_EM_SEGUNDOS = 60 * 60 * 24;

// Configuração do Better Auth como "fábrica": recebe a conexão e devolve a instância.
// O app usa com a conexão pooled (src/server/auth.ts); o script de criar usuário usa
// com a conexão direta. Assim a configuração existe em um lugar só.
export function criarAuth(db: Banco) {
  return betterAuth({
    appName: "Fornances",
    // `secret` e `baseURL` são lidos de BETTER_AUTH_SECRET e BETTER_AUTH_URL.

    database: drizzleAdapter(db, { provider: "pg", schema }),

    // Nomes das tabelas de auth em português. O valor é a chave do objeto `schema`
    // (o nome exportado em src/db/schema.ts), não o nome da tabela no banco.
    user: { modelName: "usuarios" },
    session: {
      modelName: "sessoes",
      expiresIn: 30 * UM_DIA_EM_SEGUNDOS, // sessão vale 30 dias...
      updateAge: UM_DIA_EM_SEGUNDOS, // ...e é renovada no máximo 1x por dia enquanto você usa
    },
    account: { modelName: "contasAuth" },
    verification: { modelName: "verificacoes" },

    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // ninguém se cadastra pela API; o usuário nasce pelo script
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },

    rateLimit: {
      enabled: true, // por padrão só liga em produção; queremos sempre
      // Na Vercel cada requisição pode cair em uma instância diferente, então guardar a
      // contagem em memória não funcionaria. No banco ela é compartilhada.
      storage: "database",
      modelName: "limitesRequisicao",
      customRules: {
        // Login: no máximo 5 tentativas por minuto por IP.
        "/sign-in/email": { window: 60, max: 5 },
      },
    },

    // Faz `auth.api.*` conseguir gravar cookies quando chamado em Server Actions.
    // Precisa ser o último plugin da lista.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
