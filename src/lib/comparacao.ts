import type { TipoLancamento } from "@/db/schema";

// Comparação com o mês anterior (SPEC 3.5).

/** O que a variação significa para você: define a cor do badge. */
export type AvaliacaoVariacao = "boa" | "ruim" | "neutra";

/**
 * Variação em fração: 0.105 = +10,5%. Devolve `null` quando o anterior é 0, porque não
 * dá para dizer "quantos % a mais" de zero (seria divisão por zero). A tela mostra "—".
 */
export function calcularVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / anterior;
}

/**
 * Despesa caindo é bom (verde); despesa subindo é ruim (vermelho).
 * Receita é o contrário. Sem variação (ou sem base de comparação): neutra.
 */
export function avaliarVariacao(variacao: number | null, tipo: TipoLancamento): AvaliacaoVariacao {
  if (variacao === null || variacao === 0) return "neutra";
  const subiu = variacao > 0;
  if (tipo === "despesa") return subiu ? "ruim" : "boa";
  return subiu ? "boa" : "ruim";
}

const formatadorPercentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero", // "+10,5%" e "-4,2%", mas "0,0%" sem sinal
});

/** 0.105 → "+10,5%" · -0.042 → "-4,2%" · null → "—" */
export function formatarVariacao(variacao: number | null): string {
  if (variacao === null) return "—";
  return formatadorPercentual.format(variacao).replace(/ /g, "");
}

/** Participação no total (ex.: Pix = 30% das despesas do mês). Total 0 → 0. */
export function calcularParticipacao(parte: number, total: number): number {
  return total === 0 ? 0 : parte / total;
}
