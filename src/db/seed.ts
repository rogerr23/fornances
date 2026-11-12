import type { Banco } from "./conexao";
import { categorias, type NovaCategoria } from "./schema";

type CategoriaPadrao = Pick<NovaCategoria, "nome" | "tipo" | "cor" | "icone">;

// Categorias criadas para todo usuário novo (SPEC seção 3).
// `icone` é o nome do ícone no lucide (https://lucide.dev/icons).
export const categoriasPadrao: CategoriaPadrao[] = [
  { tipo: "despesa", nome: "Alimentação", cor: "#F97316", icone: "utensils" },
  { tipo: "despesa", nome: "Mercado", cor: "#22C55E", icone: "shopping-cart" },
  { tipo: "despesa", nome: "Delivery", cor: "#EF4444", icone: "bike" },
  { tipo: "despesa", nome: "Transporte", cor: "#3B82F6", icone: "car" },
  { tipo: "despesa", nome: "Moradia", cor: "#8B5CF6", icone: "house" },
  { tipo: "despesa", nome: "Contas", cor: "#EAB308", icone: "receipt" },
  { tipo: "despesa", nome: "Saúde", cor: "#EC4899", icone: "heart-pulse" },
  { tipo: "despesa", nome: "Educação", cor: "#06B6D4", icone: "graduation-cap" },
  { tipo: "despesa", nome: "Lazer", cor: "#A855F7", icone: "gamepad-2" },
  { tipo: "despesa", nome: "Compras", cor: "#F43F5E", icone: "shopping-bag" },
  { tipo: "despesa", nome: "Assinaturas", cor: "#6366F1", icone: "repeat" },
  { tipo: "despesa", nome: "Outros", cor: "#6B7280", icone: "ellipsis" },
  { tipo: "receita", nome: "Salário/Bolsa", cor: "#10B981", icone: "wallet" },
  { tipo: "receita", nome: "Freela", cor: "#0EA5E9", icone: "briefcase" },
  { tipo: "receita", nome: "Reembolso", cor: "#14B8A6", icone: "undo-2" },
  { tipo: "receita", nome: "Outros", cor: "#6B7280", icone: "ellipsis" },
];

// Cria as categorias padrão do usuário. Pode rodar mais de uma vez sem duplicar:
// o índice único (usuario, nome, tipo) + `onConflictDoNothing` ignoram as que já existem.
export async function semearCategoriasPadrao(db: Banco, usuarioId: string) {
  const criadas = await db
    .insert(categorias)
    .values(categoriasPadrao.map((categoria) => ({ ...categoria, usuarioId })))
    .onConflictDoNothing()
    .returning({ id: categorias.id });

  return criadas.length;
}
