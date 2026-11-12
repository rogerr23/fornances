import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { FiltrosLancamentos } from "@/components/lancamentos/FiltrosLancamentos";
import { ItemLancamento } from "@/components/lancamentos/ItemLancamento";
import { formatarMes, hojeEmSaoPaulo, mesAtual, rotuloDoDia } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { filtrosLancamentosSchema } from "@/lib/validacao-lancamento";
import { listarCategoriasAtivas } from "@/server/queries/categorias";
import {
  LIMITE_PADRAO,
  listarLancamentos,
  obterTotaisPorDia,
  type LancamentoDaLista,
} from "@/server/queries/lancamentos";

export const metadata: Metadata = { title: "Lançamentos" };

export default function PaginaLancamentos({ searchParams }: PageProps<"/lancamentos">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-28">
      {/* Ler a URL e o banco acontece na hora da requisição → dentro de <Suspense>. */}
      <Suspense fallback={<ListaCarregando />}>
        <ConteudoLancamentos searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ConteudoLancamentos({
  searchParams,
}: {
  searchParams: PageProps<"/lancamentos">["searchParams"];
}) {
  // "Hoje" e "mês atual" dependem do relógio: `connection()` diz ao Next que este trecho
  // roda na hora da requisição (e não no build), então a data nunca fica congelada.
  await connection();
  // Valores inválidos na URL são ignorados (o schema usa `.catch`), não quebram a página.
  const filtros = filtrosLancamentosSchema.parse(await searchParams);
  const mes = filtros.mes ?? mesAtual();
  const hoje = hojeEmSaoPaulo();

  const [{ lancamentos, temMais }, totaisPorDia, categorias] = await Promise.all([
    listarLancamentos(filtros),
    obterTotaisPorDia(filtros),
    listarCategoriasAtivas(),
  ]);

  // Agrupa por dia mantendo a ordem (mais recente primeiro).
  const dias = new Map<string, LancamentoDaLista[]>();
  for (const lancamento of lancamentos) {
    const doDia = dias.get(lancamento.dataLancamento) ?? [];
    doDia.push(lancamento);
    dias.set(lancamento.dataLancamento, doDia);
  }

  const proximaPagina = new URLSearchParams(
    Object.entries({
      ...filtros,
      limite: String((filtros.limite ?? LIMITE_PADRAO) + LIMITE_PADRAO),
    })
      .filter((par): par is [string, string] => Boolean(par[1]))
      .map(([chave, valor]) => [chave, String(valor)]),
  );

  return (
    <>
      <FiltrosLancamentos filtros={filtros} mes={mes} categorias={categorias} />

      {dias.size === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento em {formatarMes(mes)}
          {filtros.tipo || filtros.categoria || filtros.meio || filtros.busca
            ? " com esses filtros."
            : "."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...dias].map(([data, doDia]) => {
            const totais = totaisPorDia.get(data);
            return (
              <section key={data} className="overflow-hidden rounded-xl border bg-card">
                <header className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs">
                  <h2 className="font-medium">{rotuloDoDia(data, hoje)}</h2>
                  <p className="flex gap-2 font-medium tabular-nums">
                    {totais && totais.receitas > 0 && (
                      <span className="text-entrada">+{formatarCentavos(totais.receitas)}</span>
                    )}
                    {totais && totais.despesas > 0 && (
                      <span className="text-saida">−{formatarCentavos(totais.despesas)}</span>
                    )}
                  </p>
                </header>
                <ul className="divide-y">
                  {doDia.map((lancamento) => (
                    <li key={lancamento.id}>
                      <ItemLancamento lancamento={lancamento} agendado={data > hoje} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {temMais && (
        <Link
          href={`/lancamentos?${proximaPagina}`}
          scroll={false}
          className="mx-auto rounded-full border bg-card px-5 py-2.5 text-sm hover:bg-muted"
        >
          Carregar mais
        </Link>
      )}
    </>
  );
}

function ListaCarregando() {
  return (
    <div className="flex flex-col gap-3" aria-label="Carregando lançamentos">
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
