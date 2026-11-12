import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import type { Banco } from "@/db/conexao";
import { lancamentos, recorrencias } from "@/db/schema";
import type { Data } from "@/lib/datas";
import { competenciasAGerar } from "@/lib/recorrencias";

// Cria os lançamentos que faltam das recorrentes (SPEC 3.9 e 8).
// - Roda todo dia pelo cron, na hora ao salvar uma recorrente e pelo script de dev.
// - É idempotente: rodar 2x seguidas não duplica nada (por `ultimaCompetenciaGerada`
//   e pelo índice único recorrência + competência).
// Recebe a conexão como parâmetro para servir tanto ao app quanto ao script de terminal.
export async function gerarCobrancasPendentes(
  db: Banco,
  hoje: Data,
  usuarioId?: string, // sem usuário = todos (cron); com usuário = só ele (actions)
): Promise<{ recorrenciasVerificadas: number; lancamentosCriados: number }> {
  const candidatas = await db
    .select()
    .from(recorrencias)
    .where(
      and(
        usuarioId ? eq(recorrencias.usuarioId, usuarioId) : undefined,
        lte(recorrencias.inicioEm, hoje),
        // Ativas, ou canceladas que ainda podem ter um mês antes do cancelamento para gerar.
        or(
          isNull(recorrencias.canceladaEm),
          sql`${recorrencias.canceladaEm} > coalesce(${recorrencias.ultimaCompetenciaGerada}, ${recorrencias.inicioEm} - 1)`,
        ),
      ),
    );

  let lancamentosCriados = 0;
  for (const recorrencia of candidatas) {
    const cobrancas = competenciasAGerar(recorrencia, hoje);
    const ultima = cobrancas.at(-1);
    if (!ultima) continue;

    // `batch` manda os dois comandos juntos numa transação: ou cria os lançamentos E
    // avança a última competência, ou nenhum dos dois.
    const [criados] = await db.batch([
      db
        .insert(lancamentos)
        .values(
          cobrancas.map((cobranca) => ({
            usuarioId: recorrencia.usuarioId,
            categoriaId: recorrencia.categoriaId,
            tipo: recorrencia.tipo,
            meioPagamento: recorrencia.meioPagamento,
            valorCentavos: recorrencia.valorCentavos,
            descricao: recorrencia.descricao,
            dataLancamento: cobranca.dataLancamento,
            recorrenciaId: recorrencia.id,
            competencia: cobranca.competencia,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: lancamentos.id }),
      db
        .update(recorrencias)
        .set({ ultimaCompetenciaGerada: ultima.competencia })
        .where(eq(recorrencias.id, recorrencia.id)),
    ]);
    lancamentosCriados += criados.length;
  }

  return { recorrenciasVerificadas: candidatas.length, lancamentosCriados };
}
