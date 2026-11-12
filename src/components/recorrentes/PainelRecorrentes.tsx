"use client";

import { Plus, Repeat } from "lucide-react";
import { useState, useTransition } from "react";

import { IconeCategoria } from "@/components/categorias/IconeCategoria";
import { avisos } from "@/components/layout/Avisos";
import { Button } from "@/components/ui/button";
import { formatarDataCompleta } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { ROTULO_MEIO } from "@/lib/rotulos";
import { reativarRecorrencia } from "@/server/actions/recorrencias";
import type { CategoriaResumo } from "@/server/queries/categorias";
import type { RecorrenciaDaLista } from "@/server/queries/recorrencias";

import { DialogoRecorrente } from "./FormularioRecorrente";

type Dados = {
  ativas: RecorrenciaDaLista[];
  canceladas: RecorrenciaDaLista[];
  totalDespesasMensais: number;
  totalReceitasMensais: number;
};

export function PainelRecorrentes({
  dados,
  categorias,
}: {
  dados: Dados;
  categorias: CategoriaResumo[];
}) {
  const [dialogo, setDialogo] = useState<{ edicao: RecorrenciaDaLista | null } | null>(null);
  const [reativando, iniciar] = useTransition();

  function reativar(recorrencia: RecorrenciaDaLista) {
    iniciar(async () => {
      const resultado = await reativarRecorrencia({ id: recorrencia.id });
      avisos.add(
        resultado.ok
          ? {
              title: `${recorrencia.descricao} reativada`,
              description: `Próxima cobrança: ${formatarDataCompleta(resultado.primeiraCobranca)}`,
            }
          : { title: resultado.erro },
      );
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Recorrentes</h1>
        <Button size="lg" onClick={() => setDialogo({ edicao: null })}>
          <Plus /> Nova
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Despesas fixas / mês</p>
          <p className="text-lg font-semibold text-saida tabular-nums">
            {formatarCentavos(dados.totalDespesasMensais)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Receitas fixas / mês</p>
          <p className="text-lg font-semibold text-entrada tabular-nums">
            {formatarCentavos(dados.totalReceitasMensais)}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <h2 className="border-b bg-muted/40 px-4 py-2 text-xs font-medium">
          Ativas ({dados.ativas.length})
        </h2>
        {dados.ativas.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma recorrente ainda. Cadastre assinaturas (Netflix, academia) e receitas fixas
            (salário, bolsa).
          </p>
        ) : (
          <ul className="divide-y">
            {dados.ativas.map((recorrencia) => (
              <li key={recorrencia.id}>
                <button
                  type="button"
                  onClick={() => setDialogo({ edicao: recorrencia })}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60"
                >
                  <IconeCategoria
                    icone={recorrencia.categoria.icone}
                    cor={recorrencia.categoria.cor}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{recorrencia.descricao}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Todo dia {recorrencia.diaCobranca} · {ROTULO_MEIO[recorrencia.meioPagamento]}
                      {recorrencia.proximaCobranca &&
                        ` · próxima ${formatarDataCompleta(recorrencia.proximaCobranca).slice(0, 5)}`}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
                      recorrencia.tipo === "despesa" ? "text-saida" : "text-entrada"
                    }`}
                  >
                    {recorrencia.tipo === "despesa" ? "−" : "+"}
                    {formatarCentavos(recorrencia.valorCentavos)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dados.canceladas.length > 0 && (
        <section className="overflow-hidden rounded-xl border bg-card">
          <h2 className="border-b bg-muted/40 px-4 py-2 text-xs font-medium">
            Canceladas ({dados.canceladas.length})
          </h2>
          <ul className="divide-y">
            {dados.canceladas.map((recorrencia) => (
              <li key={recorrencia.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="opacity-50">
                  <IconeCategoria
                    icone={recorrencia.categoria.icone}
                    cor={recorrencia.categoria.cor}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-muted-foreground line-through">
                    {recorrencia.descricao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cancelada em {formatarDataCompleta(recorrencia.canceladaEm ?? "")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => reativar(recorrencia)}
                  disabled={reativando}
                >
                  <Repeat /> Reativar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DialogoRecorrente
        aberto={dialogo !== null}
        edicao={dialogo?.edicao ?? null}
        categorias={categorias}
        aoFechar={() => setDialogo(null)}
      />
    </>
  );
}
