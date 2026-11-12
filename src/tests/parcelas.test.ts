import { describe, expect, it } from "vitest";

import { descricaoComParcela, gerarParcelas, valorDaParcela } from "@/lib/parcelas";

describe("gerarParcelas — valores", () => {
  it("R$ 100,00 em 3x → 33,34 / 33,33 / 33,33 (resto na 1ª)", () => {
    const parcelas = gerarParcelas({
      valorTotalCentavos: 10000,
      totalParcelas: 3,
      dataCompra: "2026-11-11",
    });
    expect(parcelas.map((p) => p.valorCentavos)).toEqual([3334, 3333, 3333]);
  });

  it("divisão exata não tem resto", () => {
    const parcelas = gerarParcelas({
      valorTotalCentavos: 12000,
      totalParcelas: 4,
      dataCompra: "2026-11-11",
    });
    expect(parcelas.map((p) => p.valorCentavos)).toEqual([3000, 3000, 3000, 3000]);
  });

  it.each([
    [10000, 3],
    [99999, 7],
    [1001, 48],
    [2, 2],
  ])("a soma das parcelas é sempre o total (%i em %ix)", (valorTotalCentavos, totalParcelas) => {
    const parcelas = gerarParcelas({ valorTotalCentavos, totalParcelas, dataCompra: "2026-01-31" });
    const soma = parcelas.reduce((total, p) => total + p.valorCentavos, 0);
    expect(soma).toBe(valorTotalCentavos);
    expect(parcelas).toHaveLength(totalParcelas);
    expect(parcelas.every((p) => p.valorCentavos > 0)).toBe(true);
  });

  it("numera de 1 a N e repete o total em todas", () => {
    const parcelas = gerarParcelas({
      valorTotalCentavos: 5000,
      totalParcelas: 3,
      dataCompra: "2026-11-11",
    });
    expect(parcelas.map((p) => [p.numeroParcela, p.totalParcelas])).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
});

describe("gerarParcelas — datas", () => {
  it("virada de ano: compra em novembro em 4x vai até fevereiro", () => {
    const parcelas = gerarParcelas({
      valorTotalCentavos: 40000,
      totalParcelas: 4,
      dataCompra: "2026-11-15",
    });
    expect(parcelas.map((p) => p.dataLancamento)).toEqual([
      "2026-11-15",
      "2026-12-15",
      "2027-01-15",
      "2027-02-15",
    ]);
  });

  it("dia 31 em mês curto usa o último dia e volta ao 31 quando existir", () => {
    const parcelas = gerarParcelas({
      valorTotalCentavos: 50000,
      totalParcelas: 5,
      dataCompra: "2026-01-31",
    });
    expect(parcelas.map((p) => p.dataLancamento)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("dia 31 de janeiro em ano bissexto cai em 29/02", () => {
    const parcelas = gerarParcelas({
      valorTotalCentavos: 20000,
      totalParcelas: 2,
      dataCompra: "2028-01-31",
    });
    expect(parcelas[1]?.dataLancamento).toBe("2028-02-29");
  });
});

describe("gerarParcelas — entradas inválidas", () => {
  const base = { valorTotalCentavos: 10000, totalParcelas: 3, dataCompra: "2026-11-11" };

  it.each([1, 0, 49, 2.5])("recusa %s parcelas", (totalParcelas) => {
    expect(() => gerarParcelas({ ...base, totalParcelas })).toThrow();
  });

  it.each([0, -100, 10.5])("recusa valor total %s", (valorTotalCentavos) => {
    expect(() => gerarParcelas({ ...base, valorTotalCentavos })).toThrow();
  });

  it("recusa valor menor que o número de parcelas (parcela de 0 centavos)", () => {
    expect(() => gerarParcelas({ ...base, valorTotalCentavos: 2 })).toThrow();
  });
});

describe("valorDaParcela", () => {
  it("mostra o valor base da parcela", () => {
    expect(valorDaParcela(10000, 3)).toBe(3333);
  });
});

describe("descricaoComParcela", () => {
  it("acrescenta (n/total) à descrição", () => {
    expect(descricaoComParcela("Notebook", 2, 10)).toBe("Notebook (2/10)");
  });

  it("sem descrição usa 'Parcela n/total'", () => {
    expect(descricaoComParcela(null, 1, 3)).toBe("Parcela 1/3");
    expect(descricaoComParcela("   ", 1, 3)).toBe("Parcela 1/3");
  });
});
