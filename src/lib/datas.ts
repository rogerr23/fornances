import { TZDate } from "@date-fns/tz";
import { addMonths, format, getDaysInMonth, isValid, parseISO } from "date-fns";

// Convenções deste arquivo:
// - Uma DATA é texto "AAAA-MM-DD" (mesmo formato da coluna `date` no Postgres).
// - Um MÊS é texto "AAAA-MM" (mesmo formato do filtro ?mes= na URL).
// Trabalhar com texto em vez de objetos Date evita que o fuso do servidor (a Vercel roda
// em UTC) mude o dia sem querer. O fuso só importa em UM lugar: descobrir que dia é
// "hoje" — e isso é sempre calculado em São Paulo.

export const FUSO_HORARIO = "America/Sao_Paulo";

export type Data = string; // "AAAA-MM-DD"
export type Mes = string; // "AAAA-MM"
export type Intervalo = { inicio: Data; fim: Data }; // inclusivo nas duas pontas
export type ModoComparacao = "ate-hoje" | "mes-inteiro";

const PADRAO_DATA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const PADRAO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function ehDataValida(texto: string): texto is Data {
  if (!PADRAO_DATA.test(texto)) return false;
  const data = parseISO(texto);
  // parseISO devolve "data inválida" para 30/02; e a comparação pega qualquer ajuste.
  return isValid(data) && format(data, "yyyy-MM-dd") === texto;
}

export function ehMesValido(texto: string): texto is Mes {
  return PADRAO_MES.test(texto);
}

/** Dia de hoje em São Paulo, não importa o fuso da máquina. */
export function hojeEmSaoPaulo(agora: Date = new Date()): Data {
  return format(new TZDate(agora, FUSO_HORARIO), "yyyy-MM-dd");
}

export function mesDaData(data: Data): Mes {
  return data.slice(0, 7);
}

export function mesAtual(agora: Date = new Date()): Mes {
  return mesDaData(hojeEmSaoPaulo(agora));
}

function primeiroDia(mes: Mes): Date {
  return parseISO(`${mes}-01`);
}

export function diasNoMes(mes: Mes): number {
  return getDaysInMonth(primeiroDia(mes));
}

/** Soma (ou subtrai) meses de um mês: "2026-01" + (-1) → "2025-12". */
export function somarMesesAoMes(mes: Mes, quantidade: number): Mes {
  return format(addMonths(primeiroDia(mes), quantidade), "yyyy-MM");
}

export function mesAnterior(mes: Mes): Mes {
  return somarMesesAoMes(mes, -1);
}

/**
 * Soma meses a uma data. Se o dia não existir no mês de destino, usa o último dia dele:
 * 31/01 + 1 mês → 28/02 (ou 29/02 em ano bissexto). É a regra das parcelas (SPEC 3.4).
 */
export function somarMeses(data: Data, quantidade: number): Data {
  return format(addMonths(parseISO(data), quantidade), "yyyy-MM-dd");
}

function dataDoMes(mes: Mes, dia: number): Data {
  return `${mes}-${String(dia).padStart(2, "0")}`;
}

/** Mês inteiro: "2026-02" → { inicio: "2026-02-01", fim: "2026-02-28" } */
export function intervaloDoMes(mes: Mes): Intervalo {
  return { inicio: dataDoMes(mes, 1), fim: dataDoMes(mes, diasNoMes(mes)) };
}

/**
 * Os dois intervalos que o Início compara (SPEC 3.5):
 * - Mês em andamento: dia 1 até hoje vs. o MESMO trecho do mês anterior.
 *   Ex.: 1–11/nov vs. 1–11/out. Se o mês anterior for mais curto, para no último dia dele
 *   (31/03 vs. 1–28/02).
 * - Mês já fechado (ou futuro): mês inteiro vs. mês anterior inteiro.
 */
export function intervalosDeComparacao(
  mes: Mes,
  hoje: Data = hojeEmSaoPaulo(),
): { atual: Intervalo; anterior: Intervalo; modo: ModoComparacao } {
  const mesPassado = mesAnterior(mes);

  if (mesDaData(hoje) !== mes) {
    return {
      atual: intervaloDoMes(mes),
      anterior: intervaloDoMes(mesPassado),
      modo: "mes-inteiro",
    };
  }

  const diaDeHoje = Number(hoje.slice(8, 10));
  const ultimoDiaComparavel = Math.min(diaDeHoje, diasNoMes(mesPassado));

  return {
    atual: { inicio: dataDoMes(mes, 1), fim: hoje },
    anterior: { inicio: dataDoMes(mesPassado, 1), fim: dataDoMes(mesPassado, ultimoDiaComparavel) },
    modo: "ate-hoje",
  };
}
