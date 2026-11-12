import { describe, expect, it } from "vitest";

import { aplicarMascaraValor, converterParaCentavos, formatarCentavos } from "@/lib/dinheiro";

// O Intl usa um espaço "não separável" (U+00A0) entre "R$" e o número.
// Trocamos por espaço comum só para os testes ficarem legíveis.
const semEspacoEspecial = (texto: string) => texto.replace(/ /g, " ");

describe("converterParaCentavos", () => {
  it.each([
    ["1.234,56", 123456],
    ["R$ 1.234,56", 123456],
    ["1234,56", 123456],
    ["1234", 123400],
    ["1.234", 123400],
    ["12,5", 1250],
    ["0,05", 5],
    ["0,10", 10],
    ["1.000.000,00", 100000000],
    ["  45,90 ", 4590],
  ])('"%s" → %i centavos', (texto, esperado) => {
    expect(converterParaCentavos(texto)).toBe(esperado);
  });

  it.each(["", "abc", "1,234", "12.34", "1.23,45", "-10,00", "10,", ",50", "1.2345"])(
    'recusa "%s"',
    (texto) => {
      expect(converterParaCentavos(texto)).toBeNull();
    },
  );
});

describe("formatarCentavos", () => {
  it.each([
    [123456, "R$ 1.234,56"],
    [5, "R$ 0,05"],
    [0, "R$ 0,00"],
    [100000000, "R$ 1.000.000,00"],
  ])("%i → %s", (centavos, esperado) => {
    expect(semEspacoEspecial(formatarCentavos(centavos))).toBe(esperado);
  });

  it("ida e volta: formatar e converter de novo dá o mesmo valor", () => {
    for (const centavos of [1, 99, 100, 123456, 9999999]) {
      expect(converterParaCentavos(formatarCentavos(centavos))).toBe(centavos);
    }
  });
});

describe("aplicarMascaraValor", () => {
  it.each([
    ["", 0, "0,00"],
    ["1", 1, "0,01"],
    ["12", 12, "0,12"],
    ["123456", 123456, "1.234,56"],
    ["R$ 1.234,567", 1234567, "12.345,67"],
    ["000150", 150, "1,50"],
  ])('"%s" → %i centavos ("%s")', (digitado, centavos, texto) => {
    expect(aplicarMascaraValor(digitado)).toEqual({ centavos, texto });
  });
});
