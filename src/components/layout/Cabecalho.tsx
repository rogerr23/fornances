import Link from "next/link";

import { BotaoSair } from "@/components/auth/BotaoSair";
import { BotaoLancar } from "@/components/lancamentos/BotaoLancar";
import { exigirUsuario } from "@/server/auth";

// Cabeçalho provisório (Fases 1–4): saudação, links, "+ Lançar" e Sair.
// Na Fase 5 vira o layout completo: barra lateral, navegação inferior e seletor de mês.
export async function Cabecalho() {
  const usuario = await exigirUsuario();
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-2">
      <div className="flex items-center gap-4">
        <p className="text-sm">
          Olá, <span className="font-medium">{primeiroNome}</span>
        </p>
        <nav className="flex gap-3 text-sm text-muted-foreground">
          <Link href="/" className="py-2 hover:text-foreground">
            Início
          </Link>
          <Link href="/lancamentos" className="py-2 hover:text-foreground">
            Lançamentos
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <BotaoLancar />
        <BotaoSair />
      </div>
    </header>
  );
}

export function CabecalhoCarregando() {
  return <div className="h-[57px] border-b bg-card" />;
}
