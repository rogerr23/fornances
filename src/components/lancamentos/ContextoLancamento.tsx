"use client";

import { createContext, use, useState, type ReactNode } from "react";

import type { LancamentoDaLista } from "@/server/queries/lancamentos";

// Estado do formulário de lançamento, compartilhado pelo app inteiro: o botão "+ Lançar"
// (cabeçalho ou flutuante) e os itens da lista abrem o MESMO diálogo.
type Estado = { aberto: false } | { aberto: true; edicao: LancamentoDaLista | null };

type ContextoValor = {
  estado: Estado;
  abrirNovo: () => void;
  abrirEdicao: (lancamento: LancamentoDaLista) => void;
  fechar: () => void;
};

const Contexto = createContext<ContextoValor | null>(null);

export function ProvedorLancamento({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ aberto: false });

  return (
    <Contexto
      value={{
        estado,
        abrirNovo: () => setEstado({ aberto: true, edicao: null }),
        abrirEdicao: (lancamento) => setEstado({ aberto: true, edicao: lancamento }),
        fechar: () => setEstado({ aberto: false }),
      }}
    >
      {children}
    </Contexto>
  );
}

export function useLancamento() {
  const valor = use(Contexto);
  if (!valor) throw new Error("useLancamento precisa estar dentro de <ProvedorLancamento>.");
  return valor;
}
