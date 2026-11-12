"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useLancamento } from "./ContextoLancamento";

/** "+ Lançar" do cabeçalho (só aparece a partir do tablet). */
export function BotaoLancar() {
  const { abrirNovo } = useLancamento();
  return (
    <Button size="lg" className="hidden sm:inline-flex" onClick={abrirNovo}>
      <Plus /> Lançar
    </Button>
  );
}

/** Botão flutuante no celular. Na Fase 5 vira o [+] da navegação inferior. */
export function BotaoLancarFlutuante() {
  const { abrirNovo } = useLancamento();
  return (
    <Button
      size="icon-lg"
      className="fixed right-4 bottom-6 z-40 size-14 rounded-full shadow-lg sm:hidden"
      onClick={abrirNovo}
      aria-label="Lançar"
    >
      <Plus className="size-6" />
    </Button>
  );
}
