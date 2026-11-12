import { diasNoMes, mesDaData, somarMesesAoMes, type Data, type Mes } from "./datas";

// Regras das recorrentes (SPEC 3.9). Tudo aqui é lógica pura, sem banco.
// "Competência" = o mês a que a cobrança se refere, guardado como o 1º dia ("2026-12-01").

export type DadosRecorrencia = {
  diaCobranca: number;
  inicioEm: Data; // "AAAA-MM-01"
  ultimaCompetenciaGerada: Data | null;
  canceladaEm: Data | null;
};

export type CobrancaAGerar = { competencia: Data; dataLancamento: Data };

export function competenciaDoMes(mes: Mes): Data {
  return `${mes}-01`;
}

/** Dia 31 em fevereiro → último dia de fevereiro (28 ou 29). */
export function dataDaCobranca(mes: Mes, diaCobranca: number): Data {
  const dia = Math.min(diaCobranca, diasNoMes(mes));
  return `${mes}-${String(dia).padStart(2, "0")}`;
}

/**
 * Mês da primeira cobrança ao cadastrar (ou reativar): este mês se o dia ainda não
 * passou (hoje conta), senão o mês seguinte. Se a pessoa escolher começar mais tarde,
 * vale o mais tarde dos dois — nunca antes do possível.
 */
export function primeiraCompetencia(diaCobranca: number, hoje: Data, mesEscolhido?: Mes): Mes {
  const mesDeHoje = mesDaData(hoje);
  const maisCedo =
    dataDaCobranca(mesDeHoje, diaCobranca) >= hoje ? mesDeHoje : somarMesesAoMes(mesDeHoje, 1);
  return mesEscolhido && mesEscolhido > maisCedo ? mesEscolhido : maisCedo;
}

/**
 * Meses que o gerador ainda precisa criar, do mais antigo ao mais novo, até o mês de hoje.
 * - Começa depois da última competência gerada (ou no início).
 * - Para quando a data da cobrança passa da data do cancelamento.
 * - Nunca gera meses antes do início (nada retroativo).
 */
export function competenciasAGerar(recorrencia: DadosRecorrencia, hoje: Data): CobrancaAGerar[] {
  const mesInicio = mesDaData(recorrencia.inicioEm);
  const depoisDaUltima = recorrencia.ultimaCompetenciaGerada
    ? somarMesesAoMes(mesDaData(recorrencia.ultimaCompetenciaGerada), 1)
    : mesInicio;
  const ultimoMes = mesDaData(hoje);

  const cobrancas: CobrancaAGerar[] = [];
  for (
    let mes = depoisDaUltima > mesInicio ? depoisDaUltima : mesInicio;
    mes <= ultimoMes;
    mes = somarMesesAoMes(mes, 1)
  ) {
    const dataLancamento = dataDaCobranca(mes, recorrencia.diaCobranca);
    if (recorrencia.canceladaEm && dataLancamento > recorrencia.canceladaEm) break;
    cobrancas.push({ competencia: competenciaDoMes(mes), dataLancamento });
  }
  return cobrancas;
}

/** Próxima data de cobrança (hoje conta). `null` se a recorrente estiver cancelada. */
export function proximaCobranca(recorrencia: DadosRecorrencia, hoje: Data): Data | null {
  if (recorrencia.canceladaEm) return null;
  const mesInicio = mesDaData(recorrencia.inicioEm);
  let mes = mesInicio > mesDaData(hoje) ? mesInicio : mesDaData(hoje);
  if (dataDaCobranca(mes, recorrencia.diaCobranca) < hoje) mes = somarMesesAoMes(mes, 1);
  return dataDaCobranca(mes, recorrencia.diaCobranca);
}

/**
 * Ao reativar: a primeira cobrança volta a seguir a regra do cadastro, e o gerador
 * precisa poder criar esse mês de novo (o lançamento dele pode ter sido apagado no
 * cancelamento). Se já existir, o índice único impede duplicar.
 */
export function dadosDeReativacao(
  recorrencia: Pick<DadosRecorrencia, "diaCobranca" | "ultimaCompetenciaGerada">,
  hoje: Data,
): { inicioEm: Data; ultimaCompetenciaGerada: Data | null } {
  const mesInicio = primeiraCompetencia(recorrencia.diaCobranca, hoje);
  const ultima = recorrencia.ultimaCompetenciaGerada;
  return {
    inicioEm: competenciaDoMes(mesInicio),
    ultimaCompetenciaGerada:
      ultima && mesDaData(ultima) >= mesInicio
        ? competenciaDoMes(somarMesesAoMes(mesInicio, -1))
        : ultima,
  };
}
