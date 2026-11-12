import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PainelRecorrentes } from "@/components/recorrentes/PainelRecorrentes";
import { listarCategoriasAtivas } from "@/server/queries/categorias";
import { listarRecorrencias } from "@/server/queries/recorrencias";

export const metadata: Metadata = { title: "Recorrentes" };

export default function PaginaRecorrentes() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-28">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <ConteudoRecorrentes />
      </Suspense>
    </main>
  );
}

async function ConteudoRecorrentes() {
  await connection(); // "próxima cobrança" depende de hoje → roda na hora da requisição
  const [dados, categorias] = await Promise.all([listarRecorrencias(), listarCategoriasAtivas()]);
  return <PainelRecorrentes dados={dados} categorias={categorias} />;
}
