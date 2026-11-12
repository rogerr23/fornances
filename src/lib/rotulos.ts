import type { MeioPagamento, TipoLancamento } from "@/db/schema";

// Textos da interface para os valores dos enums (o banco guarda sem acento).

export const MEIOS_PAGAMENTO: MeioPagamento[] = ["credito", "debito", "pix", "vale", "dinheiro"];

export const ROTULO_MEIO: Record<MeioPagamento, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  vale: "VR",
  dinheiro: "Dinheiro",
};

export const ROTULO_TIPO: Record<TipoLancamento, string> = {
  despesa: "Despesa",
  receita: "Receita",
};
