import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { categorias } from "@/db/schema";
import { exigirUsuario } from "@/server/auth";

export type CategoriaResumo = {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  cor: string;
  icone: string;
};

/** Categorias não arquivadas do usuário logado, para o formulário e os filtros. */
export const listarCategoriasAtivas = cache(async (): Promise<CategoriaResumo[]> => {
  const usuario = await exigirUsuario();

  return db
    .select({
      id: categorias.id,
      nome: categorias.nome,
      tipo: categorias.tipo,
      cor: categorias.cor,
      icone: categorias.icone,
    })
    .from(categorias)
    .where(and(eq(categorias.usuarioId, usuario.id), isNull(categorias.arquivadoEm)))
    .orderBy(asc(categorias.criadoEm));
});
