// Dinheiro SEMPRE em centavos (número inteiro). Nunca em reais com vírgula/ponto
// flutuante: 0,1 + 0,2 em float dá 0,30000000000000004. Em centavos, 10 + 20 = 30.
// Só vira "R$ 1.234,56" na hora de mostrar na tela.

const formatadorBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 123456 → "R$ 1.234,56" */
export function formatarCentavos(centavos: number): string {
  return formatadorBRL.format(centavos / 100);
}

// Aceita: "1.234,56", "R$ 1.234,56", "1234,5", "1234", "0,05", "1.234".
// Partes: (milhar com pontos OU dígitos corridos) + (vírgula + 1 ou 2 casas, opcional).
const PADRAO_VALOR_BRL = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/**
 * Converte o texto digitado em centavos, sem passar por float.
 * "1.234,56" → 123456. Devolve `null` se o texto não for um valor válido.
 */
export function converterParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$/g, "").replace(/\s/g, "");
  const partes = PADRAO_VALOR_BRL.exec(limpo);
  if (!partes) return null;

  const reais = Number(partes[1]!.replace(/\./g, ""));
  // "5" depois da vírgula significa 50 centavos, não 5: completa com zero à direita.
  const centavos = Number((partes[2] ?? "").padEnd(2, "0"));
  const total = reais * 100 + centavos;

  return Number.isSafeInteger(total) ? total : null;
}

/**
 * Máscara do campo de valor: cada dígito digitado entra pela direita, como em app de banco.
 * "1" → "0,01", "12" → "0,12", "123456" → "1.234,56". Devolve os centavos e o texto.
 */
export function aplicarMascaraValor(digitado: string): { centavos: number; texto: string } {
  const digitos = digitado.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  const centavos = Number(digitos || "0");
  const texto = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);

  return { centavos, texto };
}
