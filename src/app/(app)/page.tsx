import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

// Página provisória da Fase 0: só confirma que Tailwind, shadcn e os tokens de cor funcionam.
// Será substituída pelo Início (dashboard) na Fase 4.
const amostrasDeCor = [
  { nome: "Primária", classe: "bg-primary" },
  { nome: "Entrada", classe: "bg-entrada" },
  { nome: "Saída", classe: "bg-saida" },
  { nome: "Destaque", classe: "bg-destaque" },
];

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div className="rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold">Fornances</h1>
        <p className="text-sm text-muted-foreground">Fase 1 — login funcionando.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {amostrasDeCor.map((amostra) => (
            <div key={amostra.nome} className="flex items-center gap-2 text-sm">
              <span className={`size-5 rounded-md ${amostra.classe}`} />
              {amostra.nome}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button>
            <Plus /> Lançar
          </Button>
          <span className="rounded-full bg-entrada-suave px-2 py-0.5 text-xs font-medium text-entrada tabular-nums">
            -10,5%
          </span>
          <span className="rounded-full bg-saida-suave px-2 py-0.5 text-xs font-medium text-saida tabular-nums">
            +4,2%
          </span>
        </div>
      </div>
    </main>
  );
}
