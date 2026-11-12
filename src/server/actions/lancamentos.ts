"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { lancamentos, type NovoLancamento } from "@/db/schema";
import { gerarParcelas, gerarParcelasRestantes } from "@/lib/parcelas";
import {
  edicaoLancamentoSchema,
  exclusaoLancamentoSchema,
  idsSchema,
  novoLancamentoSchema,
} from "@/lib/validacao-lancamento";
import { exigirUsuario } from "@/server/auth";
import { categoriaValida } from "@/server/categoria-valida";

// Toda action segue a mesma receita (SPEC 7):
// (1) usuário da sessão  (2) valida com Zod  (3) grava filtrando pelo usuário  (4) refresh()
// `refresh()` pede ao Next para renderizar a página de novo com os dados atualizados.

export type ResultadoAcao<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}

export async function criarLancamento(entrada: unknown): Promise<ResultadoAcao<{ ids: string[] }>> {
  const usuario = await exigirUsuario();
  const validacao = novoLancamentoSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: primeiroErro(validacao.error) };
  const dados = validacao.data;

  if (!(await categoriaValida(usuario.id, dados.categoriaId, dados.tipo))) {
    return { ok: false, erro: "Categoria inválida." };
  }

  const base = {
    usuarioId: usuario.id,
    categoriaId: dados.categoriaId,
    tipo: dados.tipo,
    meioPagamento: dados.meioPagamento,
    descricao: dados.descricao,
  };

  let linhas: NovoLancamento[];
  if (dados.forma === "a-vista") {
    linhas = [
      { ...base, valorCentavos: dados.valorCentavos, dataLancamento: dados.dataLancamento },
    ];
  } else {
    const parcelas =
      dados.forma === "parcelado"
        ? gerarParcelas({
            valorTotalCentavos: dados.valorTotalCentavos,
            totalParcelas: dados.totalParcelas,
            dataCompra: dados.dataCompra,
          })
        : gerarParcelasRestantes({
            valorParcelaCentavos: dados.valorParcelaCentavos,
            parcelaAtual: dados.parcelaAtual,
            totalParcelas: dados.totalParcelas,
            dataParcelaAtual: dados.dataParcelaAtual,
          });
    // Mesmo id de grupo em todas: é o que permite editar/excluir "todas as parcelas".
    const grupoParcelamentoId = crypto.randomUUID();
    linhas = parcelas.map((parcela) => ({ ...base, ...parcela, grupoParcelamentoId }));
  }

  // Um único INSERT com várias linhas: ou entram todas as parcelas, ou nenhuma.
  const criados = await db.insert(lancamentos).values(linhas).returning({ id: lancamentos.id });
  refresh();
  return { ok: true, ids: criados.map((criado) => criado.id) };
}

export async function editarLancamento(entrada: unknown): Promise<ResultadoAcao> {
  const usuario = await exigirUsuario();
  const validacao = edicaoLancamentoSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: primeiroErro(validacao.error) };
  const dados = validacao.data;

  const [atual] = await db
    .select()
    .from(lancamentos)
    .where(and(eq(lancamentos.id, dados.id), eq(lancamentos.usuarioId, usuario.id)));
  if (!atual) return { ok: false, erro: "Lançamento não encontrado." };

  if (atual.grupoParcelamentoId) {
    // Parcela: continua despesa no crédito (senão deixaria de ser parcela).
    if (!(await categoriaValida(usuario.id, dados.categoriaId, "despesa"))) {
      return { ok: false, erro: "Categoria inválida." };
    }

    if (dados.escopo === "todo-grupo") {
      // No grupo inteiro só faz sentido mudar o que é igual em todas as parcelas.
      await db
        .update(lancamentos)
        .set({ categoriaId: dados.categoriaId, descricao: dados.descricao })
        .where(
          and(
            eq(lancamentos.grupoParcelamentoId, atual.grupoParcelamentoId),
            eq(lancamentos.usuarioId, usuario.id),
          ),
        );
    } else {
      await db
        .update(lancamentos)
        .set({
          categoriaId: dados.categoriaId,
          descricao: dados.descricao,
          valorCentavos: dados.valorCentavos,
          dataLancamento: dados.dataLancamento,
        })
        .where(and(eq(lancamentos.id, atual.id), eq(lancamentos.usuarioId, usuario.id)));
    }
  } else {
    if (!(await categoriaValida(usuario.id, dados.categoriaId, dados.tipo))) {
      return { ok: false, erro: "Categoria inválida." };
    }
    await db
      .update(lancamentos)
      .set({
        tipo: dados.tipo,
        categoriaId: dados.categoriaId,
        meioPagamento: dados.meioPagamento,
        descricao: dados.descricao,
        valorCentavos: dados.valorCentavos,
        dataLancamento: dados.dataLancamento,
      })
      .where(and(eq(lancamentos.id, atual.id), eq(lancamentos.usuarioId, usuario.id)));
  }

  refresh();
  return { ok: true };
}

export async function excluirLancamento(
  entrada: unknown,
): Promise<ResultadoAcao<{ quantidade: number }>> {
  const usuario = await exigirUsuario();
  const validacao = exclusaoLancamentoSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: primeiroErro(validacao.error) };
  const { id, escopo } = validacao.data;

  const [atual] = await db
    .select({ grupoParcelamentoId: lancamentos.grupoParcelamentoId })
    .from(lancamentos)
    .where(and(eq(lancamentos.id, id), eq(lancamentos.usuarioId, usuario.id)));
  if (!atual) return { ok: false, erro: "Lançamento não encontrado." };

  const alvo =
    escopo === "todo-grupo" && atual.grupoParcelamentoId
      ? eq(lancamentos.grupoParcelamentoId, atual.grupoParcelamentoId)
      : eq(lancamentos.id, id);

  const apagados = await db
    .delete(lancamentos)
    .where(and(alvo, eq(lancamentos.usuarioId, usuario.id)))
    .returning({ id: lancamentos.id });

  refresh();
  return { ok: true, quantidade: apagados.length };
}

/** Botão "Desfazer" do aviso: apaga o que acabou de ser criado (1 lançamento ou as parcelas). */
export async function desfazerLancamento(ids: unknown): Promise<ResultadoAcao> {
  const usuario = await exigirUsuario();
  const validacao = idsSchema.safeParse(ids);
  if (!validacao.success) return { ok: false, erro: "Nada para desfazer." };

  await db
    .delete(lancamentos)
    .where(and(inArray(lancamentos.id, validacao.data), eq(lancamentos.usuarioId, usuario.id)));

  refresh();
  return { ok: true };
}
