import "server-only";

import { and, desc, eq, gte, ilike, lte, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { categorias, lancamentos, type MeioPagamento, type TipoLancamento } from "@/db/schema";
import { intervaloDoMes, mesAtual, type Data } from "@/lib/datas";
import type { FiltrosLancamentos } from "@/lib/validacao-lancamento";
import { exigirUsuario } from "@/server/auth";

export const LIMITE_PADRAO = 50;

export type LancamentoDaLista = {
  id: string;
  tipo: TipoLancamento;
  meioPagamento: MeioPagamento;
  valorCentavos: number;
  dataLancamento: Data;
  descricao: string | null;
  grupoParcelamentoId: string | null;
  numeroParcela: number | null;
  totalParcelas: number | null;
  recorrenciaId: string | null;
  categoria: { id: string; nome: string; cor: string; icone: string };
};

// Monta o WHERE a partir dos filtros. O usuário vem SEMPRE da sessão (SPEC 3.7).
function condicoes(usuarioId: string, filtros: FiltrosLancamentos): SQL[] {
  const { inicio, fim } = intervaloDoMes(filtros.mes ?? mesAtual());
  const lista: SQL[] = [
    eq(lancamentos.usuarioId, usuarioId),
    gte(lancamentos.dataLancamento, inicio),
    lte(lancamentos.dataLancamento, fim),
  ];
  if (filtros.tipo) lista.push(eq(lancamentos.tipo, filtros.tipo));
  if (filtros.categoria) lista.push(eq(lancamentos.categoriaId, filtros.categoria));
  if (filtros.meio) lista.push(eq(lancamentos.meioPagamento, filtros.meio));
  if (filtros.busca) {
    // Escapa % e _ para que a busca seja literal (o usuário não digita "curingas" de SQL).
    const termo = filtros.busca.replace(/[\\%_]/g, (c) => `\\${c}`);
    lista.push(ilike(lancamentos.descricao, `%${termo}%`));
  }
  return lista;
}

/** Lançamentos do mês filtrado, mais recentes primeiro. Busca 1 a mais para saber se há "mais". */
export async function listarLancamentos(filtros: FiltrosLancamentos) {
  const usuario = await exigirUsuario();
  const limite = filtros.limite ?? LIMITE_PADRAO;

  const linhas = await db
    .select({
      id: lancamentos.id,
      tipo: lancamentos.tipo,
      meioPagamento: lancamentos.meioPagamento,
      valorCentavos: lancamentos.valorCentavos,
      dataLancamento: lancamentos.dataLancamento,
      descricao: lancamentos.descricao,
      grupoParcelamentoId: lancamentos.grupoParcelamentoId,
      numeroParcela: lancamentos.numeroParcela,
      totalParcelas: lancamentos.totalParcelas,
      recorrenciaId: lancamentos.recorrenciaId,
      categoria: {
        id: categorias.id,
        nome: categorias.nome,
        cor: categorias.cor,
        icone: categorias.icone,
      },
    })
    .from(lancamentos)
    .innerJoin(categorias, eq(categorias.id, lancamentos.categoriaId))
    .where(and(...condicoes(usuario.id, filtros)))
    .orderBy(desc(lancamentos.dataLancamento), desc(lancamentos.criadoEm), desc(lancamentos.id))
    .limit(limite + 1);

  return {
    lancamentos: linhas.slice(0, limite) satisfies LancamentoDaLista[],
    temMais: linhas.length > limite,
  };
}

/**
 * Totais por dia (mesmos filtros). Calculado no SQL, e não somando a lista no navegador,
 * para o total do dia estar certo mesmo quando a lista ainda não carregou o dia inteiro.
 */
export async function obterTotaisPorDia(filtros: FiltrosLancamentos) {
  const usuario = await exigirUsuario();

  const linhas = await db
    .select({
      data: lancamentos.dataLancamento,
      receitas:
        sql<number>`coalesce(sum(${lancamentos.valorCentavos}) filter (where ${lancamentos.tipo} = 'receita'), 0)`.mapWith(
          Number,
        ),
      despesas:
        sql<number>`coalesce(sum(${lancamentos.valorCentavos}) filter (where ${lancamentos.tipo} = 'despesa'), 0)`.mapWith(
          Number,
        ),
    })
    .from(lancamentos)
    .where(and(...condicoes(usuario.id, filtros)))
    .groupBy(lancamentos.dataLancamento);

  return new Map(linhas.map((linha) => [linha.data, linha]));
}

/**
 * Valores pré-selecionados do formulário (SPEC 5.1): o último meio de pagamento usado
 * e a última categoria usada em cada tipo.
 */
export const obterPadroesDoFormulario = cache(async () => {
  const usuario = await exigirUsuario();

  const ultimoPorTipo = await db
    .selectDistinctOn([lancamentos.tipo], {
      tipo: lancamentos.tipo,
      categoriaId: lancamentos.categoriaId,
      meioPagamento: lancamentos.meioPagamento,
      criadoEm: lancamentos.criadoEm,
    })
    .from(lancamentos)
    .where(eq(lancamentos.usuarioId, usuario.id))
    .orderBy(lancamentos.tipo, desc(lancamentos.criadoEm));

  const maisRecente = [...ultimoPorTipo].sort(
    (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime(),
  )[0];

  return {
    meioPagamento: maisRecente?.meioPagamento ?? null,
    categoriaPorTipo: {
      despesa: ultimoPorTipo.find((l) => l.tipo === "despesa")?.categoriaId ?? null,
      receita: ultimoPorTipo.find((l) => l.tipo === "receita")?.categoriaId ?? null,
    },
  };
});

export type PadroesDoFormulario = Awaited<ReturnType<typeof obterPadroesDoFormulario>>;
