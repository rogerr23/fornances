"use client";

import type { Ref } from "react";

import { IconeCategoria } from "@/components/categorias/IconeCategoria";
import { Label } from "@/components/ui/label";
import type { MeioPagamento, TipoLancamento } from "@/db/schema";
import { aplicarMascaraValor } from "@/lib/dinheiro";
import { MEIOS_PAGAMENTO, ROTULO_MEIO } from "@/lib/rotulos";
import type { CategoriaResumo } from "@/server/queries/categorias";

import { Chip } from "./Chip";

// Campos usados tanto no formulário de lançamento quanto no de recorrente.

export type ValorDigitado = ReturnType<typeof aplicarMascaraValor>;

export function AlternadorTipo({
  tipo,
  onChange,
}: {
  tipo: TipoLancamento;
  onChange: (tipo: TipoLancamento) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup">
      {(["despesa", "receita"] as const).map((opcao) => (
        <button
          key={opcao}
          type="button"
          role="radio"
          aria-checked={tipo === opcao}
          onClick={() => onChange(opcao)}
          className={`h-10 rounded-md text-sm font-medium transition-colors ${
            tipo === opcao
              ? opcao === "despesa"
                ? "bg-card text-saida shadow-sm"
                : "bg-card text-entrada shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {opcao === "despesa" ? "Despesa" : "Receita"}
        </button>
      ))}
    </div>
  );
}

/** Valor em destaque com máscara de dinheiro (dígitos entram pela direita). */
export function CampoValor({
  rotulo,
  valor,
  onChange,
  tipo,
  desativado,
  campoRef,
}: {
  rotulo: string;
  valor: ValorDigitado;
  onChange: (valor: ValorDigitado) => void;
  tipo: TipoLancamento;
  desativado?: boolean;
  campoRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="valor">{rotulo}</Label>
      <div className="flex items-baseline gap-2 border-b pb-1">
        <span className="text-lg text-muted-foreground">R$</span>
        <input
          ref={campoRef}
          id="valor"
          inputMode="decimal"
          autoComplete="off"
          value={valor.texto}
          onChange={(evento) => onChange(aplicarMascaraValor(evento.target.value))}
          // Ao tocar no campo, seleciona tudo: o próximo dígito começa um valor novo.
          onFocus={(evento) => evento.target.select()}
          disabled={desativado}
          className={`w-full bg-transparent text-3xl font-semibold tabular-nums outline-none disabled:opacity-50 ${
            tipo === "despesa" ? "text-saida" : "text-entrada"
          }`}
        />
      </div>
    </div>
  );
}

export function SeletorMeio({
  meio,
  onChange,
}: {
  meio: MeioPagamento;
  onChange: (meio: MeioPagamento) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MEIOS_PAGAMENTO.map((opcao) => (
        <Chip key={opcao} ativo={meio === opcao} onClick={() => onChange(opcao)}>
          {ROTULO_MEIO[opcao]}
        </Chip>
      ))}
    </div>
  );
}

export function GradeCategorias({
  categorias,
  selecionada,
  onChange,
}: {
  categorias: CategoriaResumo[];
  selecionada: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">Categoria</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            aria-pressed={selecionada === categoria.id}
            onClick={() => onChange(categoria.id)}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-1.5 text-center text-xs transition-colors ${
              selecionada === categoria.id
                ? "border-primary bg-primary/5 font-medium"
                : "hover:bg-muted"
            }`}
          >
            <IconeCategoria icone={categoria.icone} cor={categoria.cor} tamanho="sm" />
            <span className="line-clamp-2 leading-tight">{categoria.nome}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
