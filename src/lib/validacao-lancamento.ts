import { z } from "zod";

import { ehDataValida } from "./datas";
import { MAXIMO_PARCELAS, MINIMO_PARCELAS } from "./parcelas";

// Validação dos dados que chegam nas Server Actions de lançamentos.
// Roda no servidor: tudo que vem do navegador é tratado como não confiável.

const centavos = z
  .int({ error: "Informe um valor válido." })
  .positive({ error: "O valor precisa ser maior que zero." })
  .max(99_999_999_99, { error: "Valor alto demais." });

const data = z.string().refine(ehDataValida, { error: "Data inválida." });

const descricao = z
  .string()
  .trim()
  .max(120, { error: "Descrição muito longa (máx. 120 caracteres)." })
  .nullish()
  .transform((texto) => texto || null); // "" vira null

const tipo = z.enum(["receita", "despesa"]);
const meioPagamento = z.enum(["credito", "debito", "pix", "vale", "dinheiro"]);
const totalParcelas = z
  .int()
  .min(MINIMO_PARCELAS, { error: `Mínimo de ${MINIMO_PARCELAS} parcelas.` })
  .max(MAXIMO_PARCELAS, { error: `Máximo de ${MAXIMO_PARCELAS} parcelas.` });

const camposComuns = {
  categoriaId: z.uuid({ error: "Escolha uma categoria." }),
  descricao,
};

/**
 * Novo lançamento. O campo `forma` diz qual dos três formatos chegou:
 * - "a-vista": um lançamento só (qualquer tipo e meio).
 * - "parcelado": compra nova no crédito em N parcelas (SPEC 3.4).
 * - "em-andamento": parcelas que faltam de uma compra antiga (SPEC 3.8).
 * Parcelamento só existe para despesa no crédito.
 */
export const novoLancamentoSchema = z.discriminatedUnion("forma", [
  z.object({
    forma: z.literal("a-vista"),
    ...camposComuns,
    tipo,
    meioPagamento,
    valorCentavos: centavos,
    dataLancamento: data,
  }),
  z.object({
    forma: z.literal("parcelado"),
    ...camposComuns,
    tipo: z.literal("despesa"),
    meioPagamento: z.literal("credito"),
    valorTotalCentavos: centavos,
    totalParcelas,
    dataCompra: data,
  }),
  z
    .object({
      forma: z.literal("em-andamento"),
      ...camposComuns,
      tipo: z.literal("despesa"),
      meioPagamento: z.literal("credito"),
      valorParcelaCentavos: centavos,
      parcelaAtual: z.int().min(1, { error: "Parcela atual inválida." }),
      totalParcelas,
      dataParcelaAtual: data,
    })
    .refine((dados) => dados.parcelaAtual <= dados.totalParcelas, {
      error: "A parcela atual não pode ser maior que o total.",
      path: ["parcelaAtual"],
    }),
]);

export type NovoLancamentoEntrada = z.input<typeof novoLancamentoSchema>;

/** Onde aplicar a edição/exclusão de uma parcela (SPEC 3.4). */
export const escopoSchema = z.enum(["somente-este", "todo-grupo"]);
export type Escopo = z.infer<typeof escopoSchema>;

/**
 * Edição. Para parcelas com escopo "todo-grupo" só categoria e descrição mudam
 * (valor e data de cada parcela são individuais); o resto é ignorado.
 */
export const edicaoLancamentoSchema = z.object({
  id: z.uuid(),
  escopo: escopoSchema.default("somente-este"),
  ...camposComuns,
  tipo,
  meioPagamento,
  valorCentavos: centavos,
  dataLancamento: data,
});

export type EdicaoLancamentoEntrada = z.input<typeof edicaoLancamentoSchema>;

export const exclusaoLancamentoSchema = z.object({
  id: z.uuid(),
  escopo: escopoSchema.default("somente-este"),
});

export const idsSchema = z.array(z.uuid()).min(1).max(MAXIMO_PARCELAS);

/** Filtros da lista (vêm da URL, então tudo é opcional e ignorado se inválido). */
export const filtrosLancamentosSchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
  tipo: tipo.optional().catch(undefined),
  categoria: z.uuid().optional().catch(undefined),
  meio: meioPagamento.optional().catch(undefined),
  busca: z.string().trim().max(60).optional().catch(undefined),
  limite: z.coerce.number().int().min(50).max(1000).optional().catch(undefined),
});

export type FiltrosLancamentos = z.infer<typeof filtrosLancamentosSchema>;
