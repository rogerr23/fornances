"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatarMes, somarMesesAoMes, type Mes } from "@/lib/datas";
import { MEIOS_PAGAMENTO, ROTULO_MEIO } from "@/lib/rotulos";
import type { FiltrosLancamentos as Filtros } from "@/lib/validacao-lancamento";
import type { CategoriaResumo } from "@/server/queries/categorias";

// Os filtros vivem na URL (?mes=2026-11&tipo=despesa...). Assim dá para recarregar,
// voltar no navegador ou compartilhar o link e ver a mesma lista.
export function FiltrosLancamentos({
  filtros,
  mes,
  categorias,
}: {
  filtros: Filtros;
  mes: Mes;
  categorias: CategoriaResumo[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const [carregando, iniciar] = useTransition();
  const [busca, setBusca] = useState(filtros.busca ?? "");

  function aplicar(mudancas: Partial<Record<keyof Filtros, string | undefined>>) {
    const atuais: Record<string, string | undefined> = {
      mes: filtros.mes,
      tipo: filtros.tipo,
      categoria: filtros.categoria,
      meio: filtros.meio,
      busca: filtros.busca,
      ...mudancas,
      limite: undefined, // filtro novo começa da primeira página
    };
    const parametros = new URLSearchParams();
    for (const [chave, valor] of Object.entries(atuais)) if (valor) parametros.set(chave, valor);
    const consulta = parametros.toString();
    iniciar(() => router.replace(consulta ? `${caminho}?${consulta}` : caminho, { scroll: false }));
  }

  // Busca só depois que a pessoa para de digitar por 350 ms (não a cada tecla).
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  function digitarBusca(texto: string) {
    setBusca(texto);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => aplicar({ busca: texto.trim() || undefined }), 350);
  }

  const categoriasVisiveis = filtros.tipo
    ? categorias.filter((c) => c.tipo === filtros.tipo)
    : categorias;

  const classeSelect = "h-10 rounded-md border bg-card px-2 text-sm";

  return (
    <div className="flex flex-col gap-3" aria-busy={carregando}>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Mês anterior"
          onClick={() => aplicar({ mes: somarMesesAoMes(mes, -1) })}
        >
          <ChevronLeft />
        </Button>
        <h1 className="text-lg font-semibold">{formatarMes(mes)}</h1>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Próximo mês"
          onClick={() => aplicar({ mes: somarMesesAoMes(mes, 1) })}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={busca}
          onChange={(evento) => digitarBusca(evento.target.value)}
          placeholder="Buscar na descrição"
          aria-label="Buscar na descrição"
          className="h-10 bg-card pl-9"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label="Tipo"
          className={classeSelect}
          value={filtros.tipo ?? ""}
          onChange={(evento) =>
            aplicar({ tipo: evento.target.value || undefined, categoria: undefined })
          }
        >
          <option value="">Tudo</option>
          <option value="despesa">Despesas</option>
          <option value="receita">Receitas</option>
        </select>
        <select
          aria-label="Categoria"
          className={classeSelect}
          value={filtros.categoria ?? ""}
          onChange={(evento) => aplicar({ categoria: evento.target.value || undefined })}
        >
          <option value="">Categorias</option>
          {categoriasVisiveis.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
              {!filtros.tipo && categoria.tipo === "receita" ? " (receita)" : ""}
            </option>
          ))}
        </select>
        <select
          aria-label="Meio de pagamento"
          className={classeSelect}
          value={filtros.meio ?? ""}
          onChange={(evento) => aplicar({ meio: evento.target.value || undefined })}
        >
          <option value="">Meios</option>
          {MEIOS_PAGAMENTO.map((meio) => (
            <option key={meio} value={meio}>
              {ROTULO_MEIO[meio]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
