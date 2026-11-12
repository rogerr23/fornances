"use client";

import { IconeCategoria } from "@/components/categorias/IconeCategoria";
import { formatarCentavos } from "@/lib/dinheiro";
import { descricaoComParcela } from "@/lib/parcelas";
import { ROTULO_MEIO } from "@/lib/rotulos";
import type { LancamentoDaLista } from "@/server/queries/lancamentos";

import { useLancamento } from "./ContextoLancamento";

export function ItemLancamento({
  lancamento,
  agendado,
}: {
  lancamento: LancamentoDaLista;
  agendado: boolean;
}) {
  const { abrirEdicao } = useLancamento();
  const { categoria, numeroParcela, totalParcelas } = lancamento;
  const nome = lancamento.descricao ?? categoria.nome;
  const titulo =
    numeroParcela && totalParcelas ? descricaoComParcela(nome, numeroParcela, totalParcelas) : nome;
  const ehDespesa = lancamento.tipo === "despesa";

  return (
    <button
      type="button"
      onClick={() => abrirEdicao(lancamento)}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60"
    >
      <IconeCategoria icone={categoria.icone} cor={categoria.cor} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{titulo}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {categoria.nome} · {ROTULO_MEIO[lancamento.meioPagamento]}
          {agendado && (
            <span className="rounded-full bg-destaque-suave px-1.5 py-px text-[0.7rem] font-medium text-destaque">
              Agendado
            </span>
          )}
        </p>
      </div>
      <span
        className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
          ehDespesa ? "text-saida" : "text-entrada"
        } ${agendado ? "opacity-60" : ""}`}
      >
        {ehDespesa ? "−" : "+"}
        {formatarCentavos(lancamento.valorCentavos)}
      </span>
    </button>
  );
}
