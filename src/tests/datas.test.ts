import { describe, expect, it } from "vitest";

import {
  ehDataValida,
  ehMesValido,
  formatarDataCompleta,
  formatarDiaCurto,
  formatarMes,
  hojeEmSaoPaulo,
  intervaloDoMes,
  intervalosDeComparacao,
  mesAnterior,
  mesAtual,
  rotuloDoDia,
  somarDias,
  somarMeses,
} from "@/lib/datas";

// Os testes rodam com TZ=UTC (vitest.config.mts), igual à Vercel, para provar que
// nada depende do fuso da máquina.

describe("hojeEmSaoPaulo", () => {
  it("23h em SP ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC", () => {
    // 02:00 UTC de 01/12 = 23:00 de 30/11 em São Paulo (UTC-3)
    expect(hojeEmSaoPaulo(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11-30");
    expect(mesAtual(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
  });

  it("à meia-noite de SP já virou o dia", () => {
    expect(hojeEmSaoPaulo(new Date("2026-12-01T03:00:00Z"))).toBe("2026-12-01");
  });

  it("virada de ano no fuso de SP", () => {
    expect(hojeEmSaoPaulo(new Date("2027-01-01T02:59:59Z"))).toBe("2026-12-31");
    expect(hojeEmSaoPaulo(new Date("2027-01-01T03:00:00Z"))).toBe("2027-01-01");
  });
});

describe("intervaloDoMes", () => {
  it.each([
    ["2026-11", "2026-11-01", "2026-11-30"],
    ["2026-12", "2026-12-01", "2026-12-31"],
    ["2026-02", "2026-02-01", "2026-02-28"],
    ["2028-02", "2028-02-01", "2028-02-29"], // bissexto
  ])("%s → %s a %s", (mes, inicio, fim) => {
    expect(intervaloDoMes(mes)).toEqual({ inicio, fim });
  });
});

describe("mesAnterior e somarMeses", () => {
  it("mês anterior de janeiro é dezembro do ano anterior", () => {
    expect(mesAnterior("2027-01")).toBe("2026-12");
  });

  it.each([
    ["2026-01-31", 1, "2026-02-28"],
    ["2028-01-31", 1, "2028-02-29"],
    ["2026-03-31", 1, "2026-04-30"],
    ["2026-11-15", 2, "2027-01-15"],
    ["2026-01-31", 2, "2026-03-31"], // conta sempre a partir da data original
  ])("%s + %i mês(es) → %s", (data, meses, esperado) => {
    expect(somarMeses(data, meses)).toBe(esperado);
  });
});

describe("intervalosDeComparacao", () => {
  it("mês em andamento: 1 a 11/nov vs. 1 a 11/out", () => {
    expect(intervalosDeComparacao("2026-11", "2026-11-11")).toEqual({
      atual: { inicio: "2026-11-01", fim: "2026-11-11" },
      anterior: { inicio: "2026-10-01", fim: "2026-10-11" },
      modo: "ate-hoje",
    });
  });

  it("31/03 compara com fevereiro só até o dia 28", () => {
    expect(intervalosDeComparacao("2026-03", "2026-03-31").anterior).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
  });

  it("31/03 de ano bissexto compara com fevereiro até o dia 29", () => {
    expect(intervalosDeComparacao("2028-03", "2028-03-31").anterior).toEqual({
      inicio: "2028-02-01",
      fim: "2028-02-29",
    });
  });

  it("janeiro em andamento compara com dezembro do ano anterior", () => {
    expect(intervalosDeComparacao("2027-01", "2027-01-05").anterior).toEqual({
      inicio: "2026-12-01",
      fim: "2026-12-05",
    });
  });

  it("mês já fechado: mês inteiro vs. mês anterior inteiro", () => {
    expect(intervalosDeComparacao("2026-10", "2026-11-11")).toEqual({
      atual: { inicio: "2026-10-01", fim: "2026-10-31" },
      anterior: { inicio: "2026-09-01", fim: "2026-09-30" },
      modo: "mes-inteiro",
    });
  });
});

describe("validação de texto", () => {
  it.each(["2026-11-11", "2028-02-29"])("%s é data válida", (texto) => {
    expect(ehDataValida(texto)).toBe(true);
  });

  it.each(["2026-02-30", "2026-13-01", "11/11/2026", "2026-1-1", ""])(
    "%s não é data válida",
    (texto) => {
      expect(ehDataValida(texto)).toBe(false);
    },
  );

  it("valida mês", () => {
    expect(ehMesValido("2026-11")).toBe(true);
    expect(ehMesValido("2026-13")).toBe(false);
    expect(ehMesValido("2026-11-01")).toBe(false);
  });
});

describe("textos de data em pt-BR", () => {
  it("rótulo do dia na lista", () => {
    expect(rotuloDoDia("2026-11-11", "2026-11-11")).toBe("Hoje");
    expect(rotuloDoDia("2026-11-10", "2026-11-11")).toBe("Ontem");
    expect(rotuloDoDia("2026-11-12", "2026-11-11")).toBe("Amanhã");
    expect(rotuloDoDia("2026-11-09", "2026-11-11")).toBe("Seg, 9 nov");
    expect(rotuloDoDia("2027-01-01", "2026-12-31")).toBe("Amanhã");
  });

  it("dia curto e mês por extenso", () => {
    expect(formatarDiaCurto("2026-11-11")).toBe("11 nov");
    expect(formatarMes("2026-11")).toBe("Novembro, 2026");
    expect(formatarDataCompleta("2026-12-05")).toBe("05/12/2026");
  });

  it("somarDias atravessa mês e ano", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});
