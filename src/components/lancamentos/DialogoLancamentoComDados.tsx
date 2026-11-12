import { listarCategoriasAtivas } from "@/server/queries/categorias";
import { obterPadroesDoFormulario } from "@/server/queries/lancamentos";

import { DialogoLancamento } from "./FormularioLancamento";

// Parte do servidor do diálogo: busca categorias e padrões e entrega ao componente
// de navegador. Fica dentro de <Suspense> no layout, porque lê a sessão.
export async function DialogoLancamentoComDados() {
  const [categorias, padroes] = await Promise.all([
    listarCategoriasAtivas(),
    obterPadroesDoFormulario(),
  ]);
  return <DialogoLancamento categorias={categorias} padroes={padroes} />;
}
