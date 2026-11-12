CREATE TYPE "public"."meio_pagamento" AS ENUM('credito', 'debito', 'pix', 'vale', 'dinheiro');--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"categoria_id" uuid NOT NULL,
	"tipo" "tipo_lancamento" NOT NULL,
	"meio_pagamento" "meio_pagamento" NOT NULL,
	"valor_centavos" integer NOT NULL,
	"data_lancamento" date NOT NULL,
	"descricao" text,
	"grupo_parcelamento_id" uuid,
	"numero_parcela" smallint,
	"total_parcelas" smallint,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lancamentos_valor_positivo" CHECK ("lancamentos"."valor_centavos" > 0),
	CONSTRAINT "lancamentos_parcelas_consistentes" CHECK ((
        "lancamentos"."grupo_parcelamento_id" IS NULL AND "lancamentos"."numero_parcela" IS NULL AND "lancamentos"."total_parcelas" IS NULL
      ) OR (
        "lancamentos"."grupo_parcelamento_id" IS NOT NULL AND "lancamentos"."numero_parcela" IS NOT NULL AND "lancamentos"."total_parcelas" IS NOT NULL
        AND "lancamentos"."meio_pagamento" = 'credito'
        AND "lancamentos"."total_parcelas" BETWEEN 2 AND 48
        AND "lancamentos"."numero_parcela" BETWEEN 1 AND "lancamentos"."total_parcelas"
      ))
);
--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A restrição UNIQUE precisa existir antes da chave estrangeira composta que aponta para ela
-- (o drizzle-kit gerou na ordem inversa; reordenado à mão).
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_id_usuario_tipo_uq" UNIQUE("id","usuario_id","tipo");--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoria_fk" FOREIGN KEY ("categoria_id","usuario_id","tipo") REFERENCES "public"."categorias"("id","usuario_id","tipo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lancamentos_usuario_data_idx" ON "lancamentos" USING btree ("usuario_id","data_lancamento");--> statement-breakpoint
CREATE INDEX "lancamentos_grupo_parcelamento_idx" ON "lancamentos" USING btree ("grupo_parcelamento_id");--> statement-breakpoint
CREATE INDEX "lancamentos_categoria_idx" ON "lancamentos" USING btree ("categoria_id");
