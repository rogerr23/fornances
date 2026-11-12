import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";

import { criarAuth } from "./auth-config";

export const auth = criarAuth(db);

// Lê a sessão do cookie e confere no banco. O `cache` do React faz com que, numa mesma
// requisição, várias chamadas (layout, página, queries) consultem o banco uma vez só.
export const obterSessao = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type UsuarioLogado = { id: string; nome: string; email: string };

// Use em TODA query e action (SPEC seção 7): devolve o usuário da sessão ou manda
// para /login. O `usuarioId` das consultas vem sempre daqui, nunca do navegador.
// Com Cache Components, quem chama isto num componente precisa estar dentro de <Suspense>.
export async function exigirUsuario(): Promise<UsuarioLogado> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  return { id: sessao.user.id, nome: sessao.user.name, email: sessao.user.email };
}
