"use server";

import { and, eq, gt } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { lancamentos, recorrencias } from "@/db/schema";
import { hojeEmSaoPaulo, mesDaData, type Data } from "@/lib/datas";
import {
  competenciaDoMes,
  dadosDeReativacao,
  dataDaCobranca,
  primeiraCompetencia,
} from "@/lib/recorrencias";
import {
  cancelamentoSchema,
  edicaoRecorrenciaSchema,
  idRecorrenciaSchema,
  novaRecorrenciaSchema,
} from "@/lib/validacao-recorrencia";
import { exigirUsuario } from "@/server/auth";
import { categoriaValida } from "@/server/categoria-valida";
import { gerarCobrancasPendentes } from "@/server/gerador-recorrencias";

import type { ResultadoAcao } from "./lancamentos";

// Mesma receita das actions de lançamentos (SPEC 7):
// usuário da sessão → Zod → grava filtrando pelo usuário → refresh().

function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}

async function buscarRecorrencia(id: string, usuarioId: string) {
  const [recorrencia] = await db
    .select()
    .from(recorrencias)
    .where(and(eq(recorrencias.id, id), eq(recorrencias.usuarioId, usuarioId)));
  return recorrencia;
}

export async function criarRecorrencia(
  entrada: unknown,
): Promise<ResultadoAcao<{ primeiraCobranca: Data }>> {
  const usuario = await exigirUsuario();
  const validacao = novaRecorrenciaSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: primeiroErro(validacao.error) };
  const { mesInicio, ...dados } = validacao.data;

  if (!(await categoriaValida(usuario.id, dados.categoriaId, dados.tipo))) {
    return { ok: false, erro: "Categoria inválida." };
  }

  const hoje = hojeEmSaoPaulo();
  const mesPrimeira = primeiraCompetencia(dados.diaCobranca, hoje, mesInicio);
  await db.insert(recorrencias).values({
    ...dados,
    usuarioId: usuario.id,
    inicioEm: competenciaDoMes(mesPrimeira),
  });

  // Se a cobrança deste mês ainda não passou, ela já aparece agora (agendada).
  await gerarCobrancasPendentes(db, hoje, usuario.id);
  refresh();
  return { ok: true, primeiraCobranca: dataDaCobranca(mesPrimeira, dados.diaCobranca) };
}

export async function editarRecorrencia(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await exigirUsuario();
  const validacao = edicaoRecorrenciaSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: primeiroErro(validacao.error) };
  const { id, ...dados } = validacao.data;

  const atual = await buscarRecorrencia(id, usuario.id);
  if (!atual) return { ok: false, erro: "Recorrente não encontrada." };
  if (atual.canceladaEm) return { ok: false, erro: "Reative a recorrente antes de editar." };
  if (!(await categoriaValida(usuario.id, dados.categoriaId, dados.tipo))) {
    return { ok: false, erro: "Categoria inválida." };
  }

  const hoje = hojeEmSaoPaulo();
  // Cobranças já geradas e ainda AGENDADAS (data depois de hoje) acompanham a edição.
  // As que já foram debitadas ficam como estavam.
  const agendadas = await db
    .select({ id: lancamentos.id, competencia: lancamentos.competencia })
    .from(lancamentos)
    .where(
      and(
        eq(lancamentos.recorrenciaId, id),
        eq(lancamentos.usuarioId, usuario.id),
        gt(lancamentos.dataLancamento, hoje),
      ),
    );

  await db.batch([
    db
      .update(recorrencias)
      .set(dados)
      .where(and(eq(recorrencias.id, id), eq(recorrencias.usuarioId, usuario.id))),
    ...agendadas.map((lancamento) =>
      db
        .update(lancamentos)
        .set({
          tipo: dados.tipo,
          categoriaId: dados.categoriaId,
          meioPagamento: dados.meioPagamento,
          descricao: dados.descricao,
          valorCentavos: dados.valorCentavos,
          dataLancamento: dataDaCobranca(
            mesDaData(lancamento.competencia ?? hoje),
            dados.diaCobranca,
          ),
        })
        .where(eq(lancamentos.id, lancamento.id)),
    ),
  ]);

  refresh();
  return { ok: true };
}

export async function cancelarRecorrencia(
  entrada: unknown,
): Promise<ResultadoAcao<{ agendadasApagadas: number }>> {
  const usuario = await exigirUsuario();
  const validacao = cancelamentoSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: primeiroErro(validacao.error) };
  const { id, dataCancelamento } = validacao.data;

  const atual = await buscarRecorrencia(id, usuario.id);
  if (!atual) return { ok: false, erro: "Recorrente não encontrada." };
  if (atual.canceladaEm) return { ok: false, erro: "Esta recorrente já está cancelada." };

  // Juntos: marca o cancelamento e apaga as cobranças com data DEPOIS dele.
  const [, apagadas] = await db.batch([
    db
      .update(recorrencias)
      .set({ canceladaEm: dataCancelamento })
      .where(and(eq(recorrencias.id, id), eq(recorrencias.usuarioId, usuario.id))),
    db
      .delete(lancamentos)
      .where(
        and(
          eq(lancamentos.recorrenciaId, id),
          eq(lancamentos.usuarioId, usuario.id),
          gt(lancamentos.dataLancamento, dataCancelamento),
        ),
      )
      .returning({ id: lancamentos.id }),
  ]);

  refresh();
  return { ok: true, agendadasApagadas: apagadas.length };
}

export async function reativarRecorrencia(
  entrada: unknown,
): Promise<ResultadoAcao<{ primeiraCobranca: Data }>> {
  const usuario = await exigirUsuario();
  const validacao = idRecorrenciaSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: primeiroErro(validacao.error) };

  const atual = await buscarRecorrencia(validacao.data.id, usuario.id);
  if (!atual) return { ok: false, erro: "Recorrente não encontrada." };
  if (!atual.canceladaEm) return { ok: false, erro: "Esta recorrente já está ativa." };
  if (!(await categoriaValida(usuario.id, atual.categoriaId, atual.tipo))) {
    return {
      ok: false,
      erro: "A categoria desta recorrente foi arquivada. Desarquive a categoria ou crie uma recorrente nova.",
    };
  }

  const hoje = hojeEmSaoPaulo();
  const reativacao = dadosDeReativacao(atual, hoje);
  await db
    .update(recorrencias)
    .set({ canceladaEm: null, ...reativacao })
    .where(and(eq(recorrencias.id, atual.id), eq(recorrencias.usuarioId, usuario.id)));

  await gerarCobrancasPendentes(db, hoje, usuario.id);
  refresh();
  return {
    ok: true,
    primeiraCobranca: dataDaCobranca(mesDaData(reativacao.inicioEm), atual.diaCobranca),
  };
}
