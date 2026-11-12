import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Tabelas do Better Auth
// ---------------------------------------------------------------------------
// Os nomes das TABELAS estão em português e ligados à config via `modelName`
// (src/server/auth-config.ts). As chaves dos campos (name, emailVerified...) precisam
// ser as que o Better Auth espera, por isso ficam em inglês. Os ids são texto porque
// é o Better Auth que os gera.

export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessoes = pgTable(
  "sessoes",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
  },
  (t) => [index("sessoes_user_id_idx").on(t.userId)],
);

// "contas" do Better Auth = formas de login de um usuário (aqui, só e-mail/senha).
// O hash da senha fica em `password`. Nome com sufixo _auth para não confundir com
// contas bancárias no futuro.
export const contasAuth = pgTable(
  "contas_auth",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("contas_auth_user_id_idx").on(t.userId)],
);

export const verificacoes = pgTable(
  "verificacoes",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verificacoes_identifier_idx").on(t.identifier)],
);

// Contador de tentativas usado pelo rate limit (ex.: 5 logins por minuto por IP).
export const limitesRequisicao = pgTable("limites_requisicao", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Domínio
// ---------------------------------------------------------------------------

export const tipoLancamento = pgEnum("tipo_lancamento", ["receita", "despesa"]);
export const meioPagamento = pgEnum("meio_pagamento", [
  "credito",
  "debito",
  "pix",
  "vale",
  "dinheiro",
]);

export const categorias = pgTable(
  "categorias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    tipo: tipoLancamento("tipo").notNull(),
    cor: text("cor").notNull(), // hex, ex.: #F97316
    icone: text("icone").notNull(), // nome do ícone lucide, ex.: "utensils"
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("categorias_usuario_nome_tipo_uq").on(t.usuarioId, t.nome, t.tipo),
    // Não muda nada nas categorias em si (o `id` já é único). Existe só para a chave
    // estrangeira composta de `lancamentos` poder apontar para (id, usuario_id, tipo).
    unique("categorias_id_usuario_tipo_uq").on(t.id, t.usuarioId, t.tipo),
  ],
);

export const lancamentos = pgTable(
  "lancamentos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    categoriaId: uuid("categoria_id").notNull(),
    tipo: tipoLancamento("tipo").notNull(),
    meioPagamento: meioPagamento("meio_pagamento").notNull(),
    valorCentavos: integer("valor_centavos").notNull(), // sempre positivo; o sinal vem de `tipo`
    // `date` sem hora. O Drizzle devolve como texto "AAAA-MM-DD", que é o formato usado
    // em todo o src/lib/datas.ts (evita surpresas de fuso horário com objetos Date).
    dataLancamento: date("data_lancamento").notNull(),
    descricao: text("descricao"),
    grupoParcelamentoId: uuid("grupo_parcelamento_id"),
    numeroParcela: smallint("numero_parcela"),
    totalParcelas: smallint("total_parcelas"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("lancamentos_usuario_data_idx").on(t.usuarioId, t.dataLancamento),
    index("lancamentos_grupo_parcelamento_idx").on(t.grupoParcelamentoId),
    index("lancamentos_categoria_idx").on(t.categoriaId),

    // Chave estrangeira COMPOSTA: o lançamento só pode usar uma categoria que seja
    // do MESMO usuário e do MESMO tipo (receita/despesa). Mesmo que um bug no código
    // tente misturar, o banco recusa.
    foreignKey({
      name: "lancamentos_categoria_fk",
      columns: [t.categoriaId, t.usuarioId, t.tipo],
      foreignColumns: [categorias.id, categorias.usuarioId, categorias.tipo],
    }),

    check("lancamentos_valor_positivo", sql`${t.valorCentavos} > 0`),
    // Parcelas: ou os 3 campos estão preenchidos (e o meio é crédito), ou nenhum está.
    check(
      "lancamentos_parcelas_consistentes",
      sql`(
        ${t.grupoParcelamentoId} IS NULL AND ${t.numeroParcela} IS NULL AND ${t.totalParcelas} IS NULL
      ) OR (
        ${t.grupoParcelamentoId} IS NOT NULL AND ${t.numeroParcela} IS NOT NULL AND ${t.totalParcelas} IS NOT NULL
        AND ${t.meioPagamento} = 'credito'
        AND ${t.totalParcelas} BETWEEN 2 AND 48
        AND ${t.numeroParcela} BETWEEN 1 AND ${t.totalParcelas}
      )`,
    ),
  ],
);

export type Usuario = typeof usuarios.$inferSelect;
export type Categoria = typeof categorias.$inferSelect;
export type NovaCategoria = typeof categorias.$inferInsert;
export type Lancamento = typeof lancamentos.$inferSelect;
export type NovoLancamento = typeof lancamentos.$inferInsert;
export type TipoLancamento = (typeof tipoLancamento.enumValues)[number];
export type MeioPagamento = (typeof meioPagamento.enumValues)[number];
