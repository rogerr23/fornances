// Cria o seu usuário (e-mail + senha) e as categorias padrão.
// Uso: pnpm db:criar-usuario
//
// Por que um script? O cadastro público está desligado (`disableSignUp`), então nem a
// tela nem a API aceitam criar conta. O único jeito de nascer um usuário é por aqui,
// rodando na sua máquina com acesso ao banco.
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { z } from "zod";

import { criarConexao } from "@/db/conexao";
import { semearCategoriasPadrao } from "@/db/seed";
import { criarAuth } from "@/server/auth-config";

if (existsSync(".env")) process.loadEnvFile(".env");

const SENHA_MINIMA = 12;

async function perguntar(pergunta: string) {
  const leitor = createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await leitor.question(pergunta);
  leitor.close();
  return resposta.trim();
}

// Lê a senha sem mostrar o que é digitado (como o `sudo`).
function perguntarSenha(pergunta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;
    if (!entrada.isTTY) {
      reject(new Error("Rode este script direto no terminal (é preciso digitar a senha)."));
      return;
    }

    process.stdout.write(pergunta);
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");

    let senha = "";
    const aoDigitar = (tecla: string) => {
      for (const caractere of tecla) {
        if (caractere === "\r" || caractere === "\n") {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.off("data", aoDigitar);
          process.stdout.write("\n");
          resolve(senha);
          return;
        }
        if (caractere === "\u0003") {
          // Ctrl+C
          process.stdout.write("\n");
          process.exit(130);
        }
        if (caractere === "\u007f" || caractere === "\b") {
          senha = senha.slice(0, -1);
          continue;
        }
        senha += caractere;
      }
    };
    entrada.on("data", aoDigitar);
  });
}

async function main() {
  const urlBanco = process.env.DATABASE_URL_UNPOOLED;
  if (!urlBanco) throw new Error("DATABASE_URL_UNPOOLED não definida no .env.");
  if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET não definida no .env.");

  const db = criarConexao(urlBanco);
  const auth = criarAuth(db);
  // `$context` dá acesso às funções internas do Better Auth (as mesmas que o cadastro
  // usaria): hash de senha no formato que o login entende, criar usuário, vincular conta.
  const contexto = await auth.$context;

  console.log("Criar usuário do Fornances\n");
  const nome = await perguntar("Nome: ");
  const email = (await perguntar("E-mail: ")).toLowerCase();

  if (!nome) throw new Error("Nome é obrigatório.");
  if (!z.email().safeParse(email).success) throw new Error("E-mail inválido.");

  const existente = await contexto.internalAdapter.findUserByEmail(email);
  if (existente) {
    // Idempotente: não duplica o usuário, mas garante que as categorias padrão existem.
    const novas = await semearCategoriasPadrao(db, existente.user.id);
    console.log(`\nJá existe um usuário com ${email}. Nada foi alterado no login.`);
    console.log(`Categorias padrão criadas agora: ${novas}.`);
    return;
  }

  const senha = await perguntarSenha(`Senha (mínimo ${SENHA_MINIMA} caracteres): `);
  if (senha.length < SENHA_MINIMA)
    throw new Error(`A senha precisa ter ${SENHA_MINIMA}+ caracteres.`);
  const confirmacao = await perguntarSenha("Confirme a senha: ");
  if (senha !== confirmacao) throw new Error("As senhas não conferem.");

  const hashSenha = await contexto.password.hash(senha);
  const usuario = await contexto.internalAdapter.createUser(
    {
      name: nome,
      email,
      emailVerified: true, // não há envio de e-mail; o próprio dono está criando
    },
    { method: "email-password" }, // mesma "origem" que o cadastro do Better Auth usaria
  );
  // No Better Auth, a senha fica numa "conta" do tipo `credential` ligada ao usuário.
  await contexto.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: hashSenha,
  });

  const categoriasCriadas = await semearCategoriasPadrao(db, usuario.id);
  console.log(`\nUsuário ${email} criado com ${categoriasCriadas} categorias padrão.`);
}

main().catch((erro: unknown) => {
  console.error(`\nErro: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
