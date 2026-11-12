// Roda o gerador de recorrentes na mão (no seu Mac não existe o cron da Vercel).
// Uso: pnpm db:gerar-recorrencias
import { existsSync } from "node:fs";

import { criarConexao } from "@/db/conexao";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { gerarCobrancasPendentes } from "@/server/gerador-recorrencias";

if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const urlBanco = process.env.DATABASE_URL_UNPOOLED;
  if (!urlBanco) throw new Error("DATABASE_URL_UNPOOLED não definida no .env.");

  const hoje = hojeEmSaoPaulo();
  const resultado = await gerarCobrancasPendentes(criarConexao(urlBanco), hoje);
  console.log(
    `Hoje (SP): ${hoje} · recorrentes verificadas: ${resultado.recorrenciasVerificadas} · lançamentos criados: ${resultado.lancamentosCriados}`,
  );
}

main().catch((erro: unknown) => {
  console.error(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
});
