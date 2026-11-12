import { describe, expect, it } from "vitest";

import {
  competenciasAGerar,
  dadosDeReativacao,
  dataDaCobranca,
  primeiraCompetencia,
  proximaCobranca,
  type DadosRecorrencia,
} from "@/lib/recorrencias";

const base: DadosRecorrencia = {
  diaCobranca: 15,
  inicioEm: "2026-11-01",
  ultimaCompetenciaGerada: null,
  canceladaEm: null,
};

describe("dataDaCobranca", () => {
  it("dia que existe no mês", () => {
    expect(dataDaCobranca("2026-12", 15)).toBe("2026-12-15");
  });

  it("dia 31 em fevereiro cai no último dia (28 ou 29)", () => {
    expect(dataDaCobranca("2027-02", 31)).toBe("2027-02-28");
    expect(dataDaCobranca("2028-02", 31)).toBe("2028-02-29");
    expect(dataDaCobranca("2026-04", 31)).toBe("2026-04-30");
  });
});

describe("primeiraCompetencia", () => {
  it("dia da cobrança ainda não chegou → este mês", () => {
    expect(primeiraCompetencia(15, "2026-11-11")).toBe("2026-11");
  });

  it("dia da cobrança é hoje → este mês", () => {
    expect(primeiraCompetencia(11, "2026-11-11")).toBe("2026-11");
  });

  it("dia da cobrança já passou → mês seguinte", () => {
    expect(primeiraCompetencia(5, "2026-11-11")).toBe("2026-12");
    expect(primeiraCompetencia(5, "2026-12-20")).toBe("2027-01");
  });

  it("mês escolhido mais tarde vale; mais cedo que o possível é ignorado", () => {
    expect(primeiraCompetencia(15, "2026-11-11", "2027-02")).toBe("2027-02");
    expect(primeiraCompetencia(5, "2026-11-11", "2026-11")).toBe("2026-12");
  });
});

describe("competenciasAGerar", () => {
  it("primeira vez no mês: gera o mês atual com a data exata (mesmo que futura)", () => {
    expect(competenciasAGerar(base, "2026-11-01")).toEqual([
      { competencia: "2026-11-01", dataLancamento: "2026-11-15" },
    ]);
  });

  it("rodar de novo no mesmo mês não gera nada (já gerado)", () => {
    expect(
      competenciasAGerar({ ...base, ultimaCompetenciaGerada: "2026-11-01" }, "2026-11-20"),
    ).toEqual([]);
  });

  it("virou o mês: gera só o mês novo", () => {
    expect(
      competenciasAGerar({ ...base, ultimaCompetenciaGerada: "2026-11-01" }, "2026-12-01"),
    ).toEqual([{ competencia: "2026-12-01", dataLancamento: "2026-12-15" }]);
  });

  it("se o gerador ficou dias sem rodar, completa os meses que faltaram", () => {
    expect(
      competenciasAGerar({ ...base, ultimaCompetenciaGerada: "2026-11-01" }, "2027-01-03"),
    ).toEqual([
      { competencia: "2026-12-01", dataLancamento: "2026-12-15" },
      { competencia: "2027-01-01", dataLancamento: "2027-01-15" },
    ]);
  });

  it("nunca gera antes do início (nada retroativo)", () => {
    expect(competenciasAGerar({ ...base, inicioEm: "2027-01-01" }, "2026-12-10")).toEqual([]);
  });

  it("não gera depois do cancelamento", () => {
    const cancelada = { ...base, ultimaCompetenciaGerada: "2026-11-01", canceladaEm: "2026-11-20" };
    expect(competenciasAGerar(cancelada, "2027-01-05")).toEqual([]);
  });

  it("cancelamento depois da data da cobrança do mês ainda gera aquele mês", () => {
    expect(competenciasAGerar({ ...base, canceladaEm: "2026-11-20" }, "2026-11-01")).toEqual([
      { competencia: "2026-11-01", dataLancamento: "2026-11-15" },
    ]);
  });

  it("cancelamento antes da data da cobrança do mês não gera aquele mês", () => {
    expect(competenciasAGerar({ ...base, canceladaEm: "2026-11-10" }, "2026-11-01")).toEqual([]);
  });

  it("dia 31 em fevereiro", () => {
    expect(
      competenciasAGerar(
        { ...base, diaCobranca: 31, ultimaCompetenciaGerada: "2027-01-01" },
        "2027-02-01",
      ),
    ).toEqual([{ competencia: "2027-02-01", dataLancamento: "2027-02-28" }]);
  });

  it("reativada depois de meses parada não gera os meses parados", () => {
    // Cancelada em novembro, reativada em janeiro: o início passa a ser janeiro.
    const reativada = { ...base, inicioEm: "2027-01-01", ultimaCompetenciaGerada: "2026-11-01" };
    expect(competenciasAGerar(reativada, "2027-01-05")).toEqual([
      { competencia: "2027-01-01", dataLancamento: "2027-01-15" },
    ]);
  });
});

describe("proximaCobranca", () => {
  it("ainda neste mês", () => {
    expect(proximaCobranca(base, "2026-11-11")).toBe("2026-11-15");
  });

  it("hoje é o dia da cobrança", () => {
    expect(proximaCobranca(base, "2026-11-15")).toBe("2026-11-15");
  });

  it("já passou → mês seguinte", () => {
    expect(proximaCobranca(base, "2026-11-20")).toBe("2026-12-15");
  });

  it("início no futuro", () => {
    expect(proximaCobranca({ ...base, inicioEm: "2027-03-01" }, "2026-11-20")).toBe("2027-03-15");
  });

  it("cancelada → null", () => {
    expect(proximaCobranca({ ...base, canceladaEm: "2026-11-20" }, "2026-11-21")).toBeNull();
  });
});

describe("dadosDeReativacao", () => {
  it("cancelada antes da cobrança do mês e reativada no mesmo mês: gera o mês de novo", () => {
    // Netflix dia 15: novembro gerado, cancelada dia 10 (lançamento do dia 15 apagado),
    // reativada dia 12 → a cobrança de 15/11 precisa voltar.
    const dados = dadosDeReativacao(
      { diaCobranca: 15, ultimaCompetenciaGerada: "2026-11-01" },
      "2026-11-12",
    );
    expect(dados).toEqual({ inicioEm: "2026-11-01", ultimaCompetenciaGerada: "2026-10-01" });
    expect(
      competenciasAGerar({ ...dados, diaCobranca: 15, canceladaEm: null }, "2026-11-12"),
    ).toEqual([{ competencia: "2026-11-01", dataLancamento: "2026-11-15" }]);
  });

  it("reativada meses depois: começa no mês possível, sem gerar os meses parados", () => {
    const dados = dadosDeReativacao(
      { diaCobranca: 5, ultimaCompetenciaGerada: "2026-11-01" },
      "2027-02-10",
    );
    expect(dados).toEqual({ inicioEm: "2027-03-01", ultimaCompetenciaGerada: "2026-11-01" });
    expect(
      competenciasAGerar({ ...dados, diaCobranca: 5, canceladaEm: null }, "2027-02-10"),
    ).toEqual([]);
  });
});
