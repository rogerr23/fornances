import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

// Teste provisório da Fase 0: garante que o Vitest roda e que o alias "@/" resolve.
// Os testes de verdade (dinheiro, datas, parcelas, comparacao) entram na Fase 2.
describe("configuração do Vitest", () => {
  it("resolve o alias @/ e junta classes do Tailwind", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
