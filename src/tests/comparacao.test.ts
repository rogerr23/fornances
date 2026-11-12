import { describe, expect, it } from "vitest";

import {
  avaliarVariacao,
  calcularParticipacao,
  calcularVariacao,
  formatarVariacao,
} from "@/lib/comparacao";

describe("calcularVariacao", () => {
  it("subiu 10%", () => {
    expect(calcularVariacao(11000, 10000)).toBeCloseTo(0.1);
  });

  it("caiu 25%", () => {
    expect(calcularVariacao(7500, 10000)).toBeCloseTo(-0.25);
  });

  it("igual → 0", () => {
    expect(calcularVariacao(5000, 5000)).toBe(0);
  });

  it("anterior = 0 → null (não divide por zero)", () => {
    expect(calcularVariacao(5000, 0)).toBeNull();
    expect(calcularVariacao(0, 0)).toBeNull();
  });

  it("atual = 0 com anterior > 0 → -100%", () => {
    expect(calcularVariacao(0, 5000)).toBe(-1);
  });
});

describe("avaliarVariacao — regra de cor", () => {
  it("despesa caiu → boa (verde)", () => {
    expect(avaliarVariacao(-0.1, "despesa")).toBe("boa");
  });

  it("despesa subiu → ruim (vermelho)", () => {
    expect(avaliarVariacao(0.1, "despesa")).toBe("ruim");
  });

  it("receita subiu → boa (verde)", () => {
    expect(avaliarVariacao(0.1, "receita")).toBe("boa");
  });

  it("receita caiu → ruim (vermelho)", () => {
    expect(avaliarVariacao(-0.1, "receita")).toBe("ruim");
  });

  it.each(["despesa", "receita"] as const)("sem variação ou sem base → neutra (%s)", (tipo) => {
    expect(avaliarVariacao(0, tipo)).toBe("neutra");
    expect(avaliarVariacao(null, tipo)).toBe("neutra");
  });
});

describe("formatarVariacao", () => {
  it.each([
    [0.105, "+10,5%"],
    [-0.042, "-4,2%"],
    [1.5, "+150,0%"],
    [0, "0,0%"],
    [null, "—"],
  ])("%s → %s", (variacao, esperado) => {
    expect(formatarVariacao(variacao)).toBe(esperado);
  });
});

describe("calcularParticipacao", () => {
  it("parte do total", () => {
    expect(calcularParticipacao(3000, 10000)).toBeCloseTo(0.3);
  });

  it("total 0 → 0", () => {
    expect(calcularParticipacao(0, 0)).toBe(0);
  });
});
