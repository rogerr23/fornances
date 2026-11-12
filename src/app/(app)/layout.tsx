import { Suspense } from "react";

import { BotaoLancarFlutuante } from "@/components/lancamentos/BotaoLancar";
import { ProvedorLancamento } from "@/components/lancamentos/ContextoLancamento";
import { DialogoLancamentoComDados } from "@/components/lancamentos/DialogoLancamentoComDados";
import { ProvedorAvisos } from "@/components/layout/Avisos";
import { Cabecalho, CabecalhoCarregando } from "@/components/layout/Cabecalho";

// Layout das páginas logadas. Tudo que lê a sessão fica dentro de <Suspense>
// (Cache Components), para não travar a página inteira esperando o banco.
// As páginas e queries também chamam `exigirUsuario()` por conta própria.
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <ProvedorAvisos>
      <ProvedorLancamento>
        <Suspense fallback={<CabecalhoCarregando />}>
          <Cabecalho />
        </Suspense>
        {children}
        <BotaoLancarFlutuante />
        <Suspense>
          <DialogoLancamentoComDados />
        </Suspense>
      </ProvedorLancamento>
    </ProvedorAvisos>
  );
}
