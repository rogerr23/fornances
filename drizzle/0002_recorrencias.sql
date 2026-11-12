CREATE TABLE "recorrencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"categoria_id" uuid NOT NULL,
	"tipo" "tipo_lancamento" NOT NULL,
	"meio_pagamento" "meio_pagamento" NOT NULL,
	"descricao" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"dia_cobranca" smallint NOT NULL,
	"inicio_em" date NOT NULL,
	"ultima_competencia_gerada" date,
	"cancelada_em" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recorrencias_id_usuario_uq" UNIQUE("id","usuario_id"),
	CONSTRAINT "recorrencias_valor_positivo" CHECK ("recorrencias"."valor_centavos" > 0),
	CONSTRAINT "recorrencias_dia_valido" CHECK ("recorrencias"."dia_cobranca" BETWEEN 1 AND 31),
	CONSTRAINT "recorrencias_inicio_dia_1" CHECK (extract(day from "recorrencias"."inicio_em") = 1)
);
--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "recorrencia_id" uuid;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "competencia" date;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD CONSTRAINT "recorrencias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD CONSTRAINT "recorrencias_categoria_fk" FOREIGN KEY ("categoria_id","usuario_id","tipo") REFERENCES "public"."categorias"("id","usuario_id","tipo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recorrencias_usuario_idx" ON "recorrencias" USING btree ("usuario_id");--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_recorrencia_fk" FOREIGN KEY ("recorrencia_id","usuario_id") REFERENCES "public"."recorrencias"("id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lancamentos_recorrencia_competencia_uq" ON "lancamentos" USING btree ("recorrencia_id","competencia");--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_recorrencia_consistente" CHECK (("lancamentos"."recorrencia_id" IS NULL AND "lancamentos"."competencia" IS NULL) OR (
        "lancamentos"."recorrencia_id" IS NOT NULL AND "lancamentos"."competencia" IS NOT NULL
        AND "lancamentos"."grupo_parcelamento_id" IS NULL
      ));