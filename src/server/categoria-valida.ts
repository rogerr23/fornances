import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { categorias, type TipoLancamento } from "@/db/schema";

// A categoria precisa ser do usuário, do tipo certo e não estar arquivada.
// (O banco também garante usuário e tipo pela chave composta; aqui é para dar uma
// mensagem amigável em vez de um erro de banco.)
export async function categoriaValida(
  usuarioId: string,
  categoriaId: string,
  tipo: TipoLancamento,
): Promise<boolean> {
  const [categoria] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(
      and(
        eq(categorias.id, categoriaId),
        eq(categorias.usuarioId, usuarioId),
        eq(categorias.tipo, tipo),
        isNull(categorias.arquivadoEm),
      ),
    );
  return Boolean(categoria);
}
