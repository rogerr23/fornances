import { z } from "zod";

import { ehDataValida } from "./datas";

// Validação dos dados das Server Actions de recorrentes.

const camposRecorrencia = {
  tipo: z.enum(["receita", "despesa"]),
  categoriaId: z.uuid({ error: "Escolha uma categoria." }),
  meioPagamento: z.enum(["credito", "debito", "pix", "vale", "dinheiro"]),
  descricao: z
    .string()
    .trim()
    .min(1, { error: "Dê um nome (ex.: Netflix, Salário)." })
    .max(60, { error: "Nome muito longo (máx. 60 caracteres)." }),
  valorCentavos: z
    .int({ error: "Informe um valor válido." })
    .positive({ error: "O valor precisa ser maior que zero." })
    .max(99_999_999_99, { error: "Valor alto demais." }),
  diaCobranca: z.int().min(1, { error: "Dia inválido." }).max(31, { error: "Dia inválido." }),
};

export const novaRecorrenciaSchema = z.object({
  ...camposRecorrencia,
  // Mês em que a pessoa quer começar (opcional). Nunca vale antes do possível.
  mesInicio: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

export const edicaoRecorrenciaSchema = z.object({ id: z.uuid(), ...camposRecorrencia });

export const cancelamentoSchema = z.object({
  id: z.uuid(),
  dataCancelamento: z.string().refine(ehDataValida, { error: "Data inválida." }),
});

export const idRecorrenciaSchema = z.object({ id: z.uuid() });
