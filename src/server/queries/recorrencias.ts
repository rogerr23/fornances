import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categorias, recorrencias, type MeioPagamento, type TipoLancamento } from "@/db/schema";
import { hojeEmSaoPaulo, type Data } from "@/lib/datas";
import { proximaCobranca } from "@/lib/recorrencias";
import { exigirUsuario } from "@/server/auth";

export type RecorrenciaDaLista = {
  id: string;
  tipo: TipoLancamento;
  meioPagamento: MeioPagamento;
  descricao: string;
  valorCentavos: number;
  diaCobranca: number;
  inicioEm: Data;
  canceladaEm: Data | null;
  proximaCobranca: Data | null;
  categoria: { id: string; nome: string; cor: string; icone: string };
};

/** Recorrentes do usuário logado, separadas em ativas (pelo dia) e canceladas. */
export async function listarRecorrencias() {
  const usuario = await exigirUsuario();
  const hoje = hojeEmSaoPaulo();

  const linhas = await db
    .select({
      id: recorrencias.id,
      tipo: recorrencias.tipo,
      meioPagamento: recorrencias.meioPagamento,
      descricao: recorrencias.descricao,
      valorCentavos: recorrencias.valorCentavos,
      diaCobranca: recorrencias.diaCobranca,
      inicioEm: recorrencias.inicioEm,
      ultimaCompetenciaGerada: recorrencias.ultimaCompetenciaGerada,
      canceladaEm: recorrencias.canceladaEm,
      categoria: {
        id: categorias.id,
        nome: categorias.nome,
        cor: categorias.cor,
        icone: categorias.icone,
      },
    })
    .from(recorrencias)
    .innerJoin(categorias, eq(categorias.id, recorrencias.categoriaId))
    .where(eq(recorrencias.usuarioId, usuario.id))
    .orderBy(asc(recorrencias.diaCobranca), asc(recorrencias.descricao));

  const lista: RecorrenciaDaLista[] = linhas.map(({ ultimaCompetenciaGerada, ...linha }) => ({
    ...linha,
    proximaCobranca: proximaCobranca({ ...linha, ultimaCompetenciaGerada }, hoje),
  }));

  const ativas = lista.filter((r) => !r.canceladaEm);
  const soma = (tipo: TipoLancamento) =>
    ativas.filter((r) => r.tipo === tipo).reduce((total, r) => total + r.valorCentavos, 0);

  return {
    ativas,
    canceladas: lista.filter((r) => r.canceladaEm),
    totalDespesasMensais: soma("despesa"),
    totalReceitasMensais: soma("receita"),
  };
}
