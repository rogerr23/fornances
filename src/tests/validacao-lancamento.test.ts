import { describe, expect, it } from "vitest";

import { filtrosLancamentosSchema, novoLancamentoSchema } from "@/lib/validacao-lancamento";

const categoriaId = "6b3d8f0e-1d7a-4c39-9a2f-6a8e3b1c2d4e";

describe("novoLancamentoSchema", () => {
  it("aceita despesa à vista e transforma descrição vazia em null", () => {
    const resultado = novoLancamentoSchema.parse({
      forma: "a-vista",
      tipo: "despesa",
      meioPagamento: "pix",
      categoriaId,
      valorCentavos: 4590,
      dataLancamento: "2026-11-11",
      descricao: "   ",
    });
    expect(resultado.descricao).toBeNull();
  });

  it("recusa parcelado fora do crédito", () => {
    const resultado = novoLancamentoSchema.safeParse({
      forma: "parcelado",
      tipo: "despesa",
      meioPagamento: "pix",
      categoriaId,
      valorTotalCentavos: 10000,
      totalParcelas: 3,
      dataCompra: "2026-11-11",
    });
    expect(resultado.success).toBe(false);
  });

  it("recusa parcelado como receita", () => {
    const resultado = novoLancamentoSchema.safeParse({
      forma: "parcelado",
      tipo: "receita",
      meioPagamento: "credito",
      categoriaId,
      valorTotalCentavos: 10000,
      totalParcelas: 3,
      dataCompra: "2026-11-11",
    });
    expect(resultado.success).toBe(false);
  });

  it("recusa parcela atual maior que o total", () => {
    const resultado = novoLancamentoSchema.safeParse({
      forma: "em-andamento",
      tipo: "despesa",
      meioPagamento: "credito",
      categoriaId,
      valorParcelaCentavos: 5000,
      parcelaAtual: 11,
      totalParcelas: 10,
      dataParcelaAtual: "2026-11-11",
    });
    expect(resultado.success).toBe(false);
  });

  it.each([
    ["valor zero", { valorCentavos: 0 }],
    ["valor quebrado", { valorCentavos: 10.5 }],
    ["data inexistente", { dataLancamento: "2026-02-30" }],
    ["categoria que não é uuid", { categoriaId: "abc" }],
  ])("recusa %s", (_, alteracao) => {
    const resultado = novoLancamentoSchema.safeParse({
      forma: "a-vista",
      tipo: "despesa",
      meioPagamento: "pix",
      categoriaId,
      valorCentavos: 1000,
      dataLancamento: "2026-11-11",
      ...alteracao,
    });
    expect(resultado.success).toBe(false);
  });
});

describe("filtrosLancamentosSchema", () => {
  it("ignora valores inválidos da URL em vez de quebrar a página", () => {
    expect(
      filtrosLancamentosSchema.parse({ mes: "2026-13", tipo: "x", meio: "boleto", limite: "abc" }),
    ).toEqual({});
  });

  it("lê filtros válidos", () => {
    expect(
      filtrosLancamentosSchema.parse({
        mes: "2026-11",
        tipo: "despesa",
        meio: "pix",
        limite: "100",
      }),
    ).toEqual({ mes: "2026-11", tipo: "despesa", meio: "pix", limite: 100 });
  });
});
