import { timingSafeEqual } from "node:crypto";

import { db } from "@/db";
import { hojeEmSaoPaulo } from "@/lib/datas";
import { gerarCobrancasPendentes } from "@/server/gerador-recorrencias";

// Chamada todo dia pela Vercel Cron (vercel.json). A Vercel envia o cabeçalho
// "Authorization: Bearer <CRON_SECRET>"; qualquer outra chamada recebe 401.
export async function GET(request: Request) {
  if (!autorizado(request.headers.get("authorization"))) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const hoje = hojeEmSaoPaulo();
  const resultado = await gerarCobrancasPendentes(db, hoje);
  return Response.json({ hoje, ...resultado });
}

function autorizado(cabecalho: string | null): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || !cabecalho) return false;

  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(cabecalho);
  // Comparação em tempo constante: não deixa "adivinhar" o segredo medindo o tempo de resposta.
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
