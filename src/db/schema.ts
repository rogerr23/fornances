import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
  (t) => [uniqueIndex("categorias_usuario_nome_tipo_uq").on(t.usuarioId, t.nome, t.tipo)],
);

export type Usuario = typeof usuarios.$inferSelect;
export type Categoria = typeof categorias.$inferSelect;
export type NovaCategoria = typeof categorias.$inferInsert;
export type TipoLancamento = (typeof tipoLancamento.enumValues)[number];
