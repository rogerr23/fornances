import { somarMeses, type Data } from "./datas";

// Regras de parcelamento (SPEC 3.4). Só vale para meio de pagamento "credito".

export const MINIMO_PARCELAS = 2;
export const MAXIMO_PARCELAS = 48;

export type Parcela = {
  numeroParcela: number; // 1..totalParcelas
  totalParcelas: number;
  valorCentavos: number;
  dataLancamento: Data;
};

/**
 * Divide uma compra em N parcelas.
 * - Cada parcela vale floor(total / N); o resto dos centavos vai na 1ª.
 *   Ex.: R$ 100,00 em 3x → 33,34 + 33,33 + 33,33.
 * - A parcela i cai na data da compra + (i-1) meses; se o dia não existir no mês,
 *   usa o último dia (31/01 → 28/02).
 *
 * Não gera o `grupoParcelamentoId`: isso é responsabilidade de quem grava no banco.
 */
export function gerarParcelas(entrada: {
  valorTotalCentavos: number;
  totalParcelas: number;
  dataCompra: Data;
}): Parcela[] {
  const { valorTotalCentavos, totalParcelas, dataCompra } = entrada;

  if (!Number.isSafeInteger(valorTotalCentavos) || valorTotalCentavos <= 0) {
    throw new Error("O valor total precisa ser um número inteiro de centavos maior que zero.");
  }
  if (
    !Number.isInteger(totalParcelas) ||
    totalParcelas < MINIMO_PARCELAS ||
    totalParcelas > MAXIMO_PARCELAS
  ) {
    throw new Error(
      `O número de parcelas precisa estar entre ${MINIMO_PARCELAS} e ${MAXIMO_PARCELAS}.`,
    );
  }
  if (valorTotalCentavos < totalParcelas) {
    // Cada parcela precisa valer pelo menos 1 centavo (o banco recusa valor zero).
    throw new Error("O valor é pequeno demais para esse número de parcelas.");
  }

  const valorBase = Math.floor(valorTotalCentavos / totalParcelas);
  const resto = valorTotalCentavos - valorBase * totalParcelas;

  return Array.from({ length: totalParcelas }, (_, indice) => ({
    numeroParcela: indice + 1,
    totalParcelas,
    valorCentavos: indice === 0 ? valorBase + resto : valorBase,
    // Sempre a partir da data ORIGINAL da compra (e não da parcela anterior), senão uma
    // compra em 31/01 viraria 28/02 e depois 28/03, 28/04... em vez de 31/03, 30/04...
    dataLancamento: somarMeses(dataCompra, indice),
  }));
}

/** Valor de cada parcela para mostrar no seletor "3x de R$ 33,33" (a 1ª pode ter centavos a mais). */
export function valorDaParcela(valorTotalCentavos: number, totalParcelas: number): number {
  return Math.floor(valorTotalCentavos / totalParcelas);
}

/** Texto exibido na lista: "Notebook (2/10)". Sem descrição: "Parcela 2/10". */
export function descricaoComParcela(
  descricao: string | null,
  numeroParcela: number,
  totalParcelas: number,
): string {
  const texto = descricao?.trim();
  return texto
    ? `${texto} (${numeroParcela}/${totalParcelas})`
    : `Parcela ${numeroParcela}/${totalParcelas}`;
}
