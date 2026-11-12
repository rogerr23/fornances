import { BotaoSair } from "@/components/auth/BotaoSair";
import { exigirUsuario } from "@/server/auth";

// Cabeçalho provisório da Fase 1 (saudação + Sair).
// Na Fase 4 vira o layout completo: barra lateral, navegação inferior e seletor de mês.
export async function Cabecalho() {
  const usuario = await exigirUsuario();
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-2">
      <p className="text-sm">
        Olá, <span className="font-medium">{primeiroNome}</span>
      </p>
      <BotaoSair />
    </header>
  );
}

export function CabecalhoCarregando() {
  return <div className="h-[57px] border-b bg-card" />;
}
