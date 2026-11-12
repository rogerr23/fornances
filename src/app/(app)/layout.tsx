import { Suspense } from "react";

import { Cabecalho, CabecalhoCarregando } from "@/components/layout/Cabecalho";

// Layout das páginas logadas. A sessão é conferida dentro do <Suspense> (no Cabecalho),
// e não no topo do layout, para não travar a página inteira esperando o banco.
// As páginas e queries também chamam `exigirUsuario()` por conta própria.
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<CabecalhoCarregando />}>
        <Cabecalho />
      </Suspense>
      {children}
    </>
  );
}
