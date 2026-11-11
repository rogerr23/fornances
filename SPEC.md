# Controle de Gastos — Especificação do projeto

> Documento de contexto para o Claude Code. Leia inteiro antes de começar e siga as fases na ordem.
> Referência visual: `docs/referencia-layout.jpg`.

---

## 1. Contexto

Sistema **pessoal** para registrar e acompanhar meus gastos e receitas. Uso só eu por enquanto, mas o código já deve estar preparado para multiusuário no futuro (toda tabela de dados tem `usuarioId`).

**Objetivo principal:** saber **quanto gastei, com o quê e por qual meio de pagamento**, e principalmente **se melhorei em relação ao mês passado**.

- Lançamento **100% manual** (sem importação de extrato, sem Open Finance nesta fase).
- Uso principal pelo **celular** (PWA instalável), mas também no desktop.
- Meios de pagamento: **crédito, débito, Pix, VR/VA, dinheiro**.

---

## 2. Stack (fechada — não trocar sem perguntar)

| Camada           | Tecnologia                                                                       |
| ---------------- | -------------------------------------------------------------------------------- |
| Framework        | **Next.js** (App Router, versão estável mais recente) + **TypeScript** strict    |
| Banco            | **PostgreSQL no Neon** (projeto dedicado)                                        |
| ORM / migrations | **Drizzle ORM** + **drizzle-kit**, driver `@neondatabase/serverless`             |
| Auth             | **Better Auth** com **e-mail e senha**, cadastro público desligado (ver seção 8) |
| Validação        | **Zod**                                                                          |
| UI               | **Tailwind CSS** + **shadcn/ui** + **lucide-react** (ícones)                     |
| Gráficos         | **Recharts**                                                                     |
| Datas            | **date-fns** (+ `@date-fns/tz`) com locale `pt-BR`                               |
| Testes           | **Vitest** para lógica pura                                                      |
| Deploy           | **Vercel** (plano Hobby)                                                         |
| Mobile           | **PWA** (manifest + ícones; offline não é requisito do MVP)                      |
| Package manager  | **pnpm**                                                                         |

Antes de instalar qualquer dependência fora desta lista, pergunte.
Consulte a documentação atual de Next.js, Drizzle e Better Auth antes de configurar (APIs mudam entre versões).

---

## 3. Regras de negócio (importante)

1. **Dinheiro sempre em centavos** (`integer`). Nunca `float`. Formatar só na exibição com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
2. **Fuso horário:** `America/Sao_Paulo`. "Hoje", "mês atual" e todos os intervalos são calculados nesse fuso. A data do lançamento é tipo `date` (sem hora).
3. **Não existe lançamento de "pagamento de fatura".** Compras no crédito são lançadas no dia da compra. Pagar a fatura não é despesa (seria contar em dobro). Mostrar essa dica no formulário quando o meio de pagamento for crédito.
4. **Parcelamento** (só para meio de pagamento `credito`):
   - Ao lançar uma compra em N parcelas, criar **N lançamentos** com o mesmo `grupoParcelamentoId`, `numeroParcela` de 1..N e `totalParcelas = N`.
   - Valor de cada parcela = `floor(total / N)`. O **resto dos centavos vai na 1ª parcela**.
   - Parcela i tem `dataLancamento` = data da compra + (i-1) meses. Se o dia não existir no mês, usar o último dia do mês (31/01 → 28/02).
   - Descrição exibida: `"Descrição (2/10)"`.
   - Editar/excluir uma parcela: perguntar se aplica **só nesta** ou **em todas as parcelas do grupo**.
5. **Comparação com o mês anterior:**
   - **Mês em andamento:** comparar do dia 1 até hoje com o **mesmo intervalo do mês anterior** (1 a 11/nov vs. 1 a 11/out). Se o mês anterior for mais curto, limitar ao último dia dele.
   - **Mês já fechado:** mês inteiro vs. mês anterior inteiro.
   - Variação % = `(atual - anterior) / anterior`. Se anterior = 0, mostrar "—" (não dividir por zero).
   - Para **despesas, queda é bom** (verde) e alta é ruim (vermelho). Para **receitas**, o contrário.
6. **Categorias:** cada uma é do tipo `receita` ou `despesa`. As categorias padrão são criadas junto com o usuário (seed por usuário, ver seção 8). Categoria com lançamentos não é apagada, é arquivada (`arquivadoEm`).
7. **Toda query e toda mutation filtra por `usuarioId` da sessão.** Nunca confiar em `usuarioId` vindo do cliente.

### Categorias padrão (seed)

- **Despesa:** Alimentação, Mercado, Delivery, Transporte, Moradia, Contas (luz/água/internet), Saúde, Educação, Lazer, Compras, Assinaturas, Outros
- **Receita:** Salário/Bolsa, Freela, Reembolso, Outros

---

## 4. Modelo de dados (Drizzle / Postgres)

Nomes de tabelas, colunas, enums e valores de enum em **português, sem acento nem ç**. No banco em `snake_case`; no TypeScript em `camelCase`.

**Tabelas de auth:** as que o Better Auth exigir (gerar com o CLI/adapter Drizzle dele), renomeando as tabelas via `modelName` na config: `usuarios`, `sessoes`, `contas_auth`, `verificacoes`. As colunas dessas tabelas ficam com os nomes padrão do Better Auth (não vale a pena brigar com a lib).

```ts
// src/db/schema.ts (referência)
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
    usuarioId: text("usuario_id").notNull(), // FK para `usuarios` (Better Auth)
    nome: text("nome").notNull(),
    tipo: tipoLancamento("tipo").notNull(),
    cor: text("cor").notNull(), // hex
    icone: text("icone").notNull(), // nome do ícone lucide
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("categorias_usuario_nome_tipo_uq").on(t.usuarioId, t.nome, t.tipo)],
);

export const lancamentos = pgTable(
  "lancamentos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: text("usuario_id").notNull(),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categorias.id),
    tipo: tipoLancamento("tipo").notNull(),
    meioPagamento: meioPagamento("meio_pagamento").notNull(),
    valorCentavos: integer("valor_centavos").notNull(), // sempre positivo; o sinal vem de `tipo`
    dataLancamento: date("data_lancamento").notNull(),
    descricao: text("descricao"),
    grupoParcelamentoId: uuid("grupo_parcelamento_id"),
    numeroParcela: smallint("numero_parcela"),
    totalParcelas: smallint("total_parcelas"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("lancamentos_usuario_data_idx").on(t.usuarioId, t.dataLancamento),
    index("lancamentos_grupo_parcelamento_idx").on(t.grupoParcelamentoId),
    check("valor_positivo", sql`${t.valorCentavos} > 0`),
  ],
);
```

Validar com Zod (e no banco quando possível): `tipo` do lançamento = `tipo` da categoria; campos de parcela (`grupoParcelamentoId`, `numeroParcela`, `totalParcelas`) só preenchidos quando `meioPagamento = 'credito'`; `totalParcelas` entre 2 e 48.

Tipos inferidos do schema também em português: `type Lancamento = typeof lancamentos.$inferSelect`, `type NovoLancamento = typeof lancamentos.$inferInsert`, `type Categoria = typeof categorias.$inferSelect`.

---

## 5. Funcionalidades do MVP

### 5.1 Lançamento rápido (prioridade máxima)

Abre por botão **"+ Lançar"** (header no desktop, botão flutuante no mobile). No mobile é um **Sheet/Drawer de baixo**; no desktop, um Dialog.

- Alternador **Despesa / Receita** (padrão: Despesa)
- **Valor** em destaque, teclado numérico (`inputMode="decimal"`), máscara BRL, foco automático
- **Meio de pagamento** como chips: Crédito · Débito · Pix · VR · Dinheiro (pré-selecionado com o último usado)
- **Categoria** como grid de chips com ícone/cor (pré-selecionada com a última usada naquele tipo)
- **Data** = hoje por padrão, com atalhos "Hoje" / "Ontem" / escolher
- **Descrição** opcional
- **Parcelas** (aparece só quando meio de pagamento = Crédito): 1x a 48x, mostrando o valor de cada parcela
- Botões **Salvar** e **Salvar e lançar outro**
- Toast de confirmação com **Desfazer**

Meta: registrar um gasto em ~5 segundos.

### 5.2 Início (dashboard)

Seletor de mês no header (padrão: mês atual). Botão de **olho** para ocultar valores (`R$ ••••`), persistido em localStorage.

1. **Cards de indicadores** (4): **Despesas**, **Receitas**, **Saldo do mês** e **Maior categoria do mês**. Cada card mostra o valor, a variação vs. mês anterior (badge verde/vermelha conforme a regra 3.5) e o texto "vs. mesmo período de out" ou "vs. outubro".
2. **Gráfico anual** (barras agrupadas por mês, Jan–Dez): entradas (verde) e saídas (vermelho). Tooltip com valores do mês. Seletor de ano.
3. **Gastos por categoria**: lista ordenada por valor, com barra proporcional, valor atual, valor do mês anterior e seta ↑↓ com %. **É o bloco mais importante da tela.**
4. **Gastos por meio de pagamento**: crédito/débito/Pix/VR/dinheiro com total, % do mês e variação.
5. **Últimos lançamentos**: 5 mais recentes + link "Ver todos".

### 5.3 Lançamentos

- Lista agrupada por dia ("Hoje", "Ontem", "Seg, 9 nov"), com total do dia
- Filtros: mês, tipo, categoria, meio de pagamento, busca por descrição (estado na URL via search params, com nomes em português: `?mes=2026-11&tipo=despesa&categoria=...&meio=pix&busca=...`)
- Editar e excluir (com a regra de parcelas da seção 3.4)
- Paginação por cursor ou "carregar mais"

### 5.4 Categorias

CRUD simples: nome, tipo, cor, ícone. Arquivar em vez de excluir quando houver lançamentos.

### Fora do escopo do MVP (não implementar agora)

Cartões e faturas, metas/orçamentos, contas recorrentes, score de saúde financeira, importação de extrato, Open Finance, modo offline, multiusuário público, recuperação de senha por e-mail.

---

## 6. Design (seguir `docs/referencia-layout.jpg`)

- Fundo da página cinza muito claro (`~#F4F5F7`); **cards brancos**, borda sutil (`~#E9EAEE`), **raio ~16px**, pouca sombra
- Fonte sans moderna (Inter ou Geist), números com `tabular-nums`
- **Cores semânticas** (definir como tokens CSS/Tailwind):
  - Primária / ação: azul `~#2563EB` (botão "+ Lançar")
  - Entrada / positivo: verde-esmeralda `~#1FC59A`
  - Saída / negativo: vermelho `~#F0384B`
  - Neutro secundário: roxo `~#7C5CFC` (reservado para investimentos no futuro)
- Badges de variação em pílula: fundo claro + texto colorido (`+10,5%`)
- **Desktop:** sidebar fixa à esquerda com logo, grupo "Análise" (Início, Lançamentos, Categorias) e usuário no rodapé (com opção **Sair**); header com saudação ("Boa noite, Roger" conforme a hora), seletor de mês e botão "+ Lançar"
- **Mobile (prioridade):** sem sidebar; **bottom navigation** (Início · Lançamentos · [+] · Categorias); cards empilhados em 1 coluna; gráfico com scroll horizontal se preciso; alvos de toque ≥ 44px
- Suporte a **dark mode** via tokens (pode vir depois do MVP, mas não hardcodar cores)
- Valores em pt-BR: `R$ 1.234,56`, datas `11 nov`, meses `Novembro, 2026`

---

## 7. Arquitetura e estrutura de pastas

- **Leituras:** funções em `src/server/queries/*` chamadas por **Server Components**
- **Escritas:** **Server Actions** em `src/server/actions/*`, sempre: (1) pegar sessão com `exigirUsuario()`, (2) validar com Zod, (3) executar filtrando por `usuarioId`, (4) `revalidatePath`
- **Lógica pura** (datas, parcelas, comparação, formatação) em `src/lib/*`, **sem acesso a banco**, coberta por testes
- Agregações feitas **no SQL** (`date_trunc`, `sum`, `group by`) com Drizzle, nunca somando em JS

**Pastas estruturais ficam em inglês** (`app`, `components`, `ui`, `layout`, `db`, `lib`, `server`, `queries`, `actions`, `tests`, `scripts` e os arquivos de convenção do Next como `page.tsx`, `layout.tsx`, `route.ts`). **Arquivos e pastas de domínio ficam em português** (`lancamentos.ts`, `parcelas.ts`, `components/lancamentos/`).

```
.
├── docs/
│   └── referencia-layout.jpg
├── drizzle/                         # migrations geradas
├── public/icons/                    # ícones PWA
├── scripts/
│   └── criar-usuario.ts             # cria meu usuário + categorias padrão (seção 8)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/layout.tsx         # barra lateral/navegação inferior + cabeçalho
│   │   ├── (app)/page.tsx           # Início
│   │   ├── (app)/lancamentos/page.tsx
│   │   ├── (app)/categorias/page.tsx
│   │   ├── api/auth/[...all]/route.ts
│   │   └── manifest.ts
│   ├── components/
│   │   ├── ui/                      # shadcn (não renomear)
│   │   ├── inicio/                  # CardIndicador, GraficoAnual, GastosPorCategoria, GastosPorMeioPagamento
│   │   ├── lancamentos/             # FormularioLancamento, ListaLancamentos, FiltrosLancamentos
│   │   ├── categorias/              # FormularioCategoria, ListaCategorias
│   │   └── layout/                  # BarraLateral, NavegacaoInferior, Cabecalho, SeletorMes
│   ├── db/
│   │   ├── index.ts                 # client Drizzle + Neon
│   │   ├── schema.ts
│   │   └── seed.ts                  # semearCategoriasPadrao(usuarioId)
│   ├── lib/
│   │   ├── dinheiro.ts              # parse/formatação de centavos
│   │   ├── datas.ts                 # intervalos de mês, mesmo período anterior, fuso SP
│   │   ├── parcelas.ts              # geração de parcelas
│   │   └── comparacao.ts            # variação %, regra de cor
│   ├── server/
│   │   ├── auth.ts                  # config Better Auth + helper exigirUsuario()
│   │   ├── queries/                 # inicio.ts, lancamentos.ts, categorias.ts
│   │   └── actions/                 # lancamentos.ts, categorias.ts
│   └── tests/                       # dinheiro.test.ts, datas.test.ts, parcelas.test.ts, comparacao.test.ts
├── drizzle.config.ts
├── .env.example
└── SPEC.md
```

### Queries principais (`src/server/queries/inicio.ts`)

- `obterResumoMes(usuarioId, mes)` → `{ receitas, despesas, saldo, anterior: {...}, modoComparacao: 'ate-hoje' | 'mes-inteiro' }`
- `obterGastosPorCategoria(usuarioId, mes)` → `[{ categoriaId, nome, cor, icone, atual, anterior, variacaoPct }]`
- `obterGastosPorMeioPagamento(usuarioId, mes)` → `[{ meioPagamento, atual, anterior, participacaoPct, variacaoPct }]`
- `obterSerieAnual(usuarioId, ano)` → `[{ mes: 1..12, receitas, despesas }]` (12 posições, zeros quando vazio)

### Actions principais

- `src/server/actions/lancamentos.ts`: `criarLancamento`, `editarLancamento`, `excluirLancamento` (estes dois com `escopo: 'somente-este' | 'todo-grupo'` para parcelas), `desfazerLancamento`
- `src/server/actions/categorias.ts`: `criarCategoria`, `editarCategoria`, `arquivarCategoria`, `excluirCategoria`

---

## 8. Autenticação e segurança

- Better Auth com **e-mail e senha** (`emailAndPassword.enabled: true`) e **cadastro público desligado** (`disableSignUp: true`). Não existe tela de cadastro; a página `/login` tem só e-mail, senha e botão "Entrar".
- **Criação do usuário:** script `pnpm db:criar-usuario` (`scripts/criar-usuario.ts`) que pergunta nome, e-mail e senha no terminal (senha sem eco, nunca em `.env` nem em argumento de linha de comando), cria o usuário com o hash de senha do próprio Better Auth e chama `semearCategoriasPadrao(usuarioId)`. Deve ser idempotente: se o e-mail já existir, avisa e não duplica. Consultar a doc do Better Auth para a forma correta de criar usuário com cadastro desligado (API server-side ou utilitário de hash + inserção nas tabelas).
- Senha com **mínimo de 12 caracteres** (`minPasswordLength`).
- **Rate limit** do Better Auth ligado no endpoint de login (inclusive em produção).
- Mensagem de erro genérica no login ("E-mail ou senha inválidos"), sem dizer qual dos dois está errado.
- Sessão em cookie `httpOnly`, `secure` em produção, `sameSite=lax` (padrão do Better Auth); validade de 30 dias com renovação.
- Todas as rotas de `(app)` exigem sessão (redirecionar para `/login`); `/login` com sessão ativa redireciona para `/`.
- Helper `exigirUsuario()` usado em **toda** query e action; retorna o usuário da sessão ou redireciona.
- Botão **Sair** no rodapé da barra lateral (desktop) e no menu do usuário (mobile).
- Nenhum segredo no código; `.env` no `.gitignore`; `.env.example` versionado.

### Variáveis de ambiente (`.env.example`)

```
DATABASE_URL=            # Neon, string POOLED (host com -pooler) — usada pela app
DATABASE_URL_UNPOOLED=   # Neon, string direta — usada pelo drizzle-kit nas migrations e pelo script de criar usuário
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
```

Scripts no `package.json`: `dev`, `build`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:studio`, `db:criar-usuario`.

---

## 9. Testes (Vitest)

Cobrir obrigatoriamente:

- `parcelas.ts`: divisão com resto (R$ 100,00 em 3x → 33,34 / 33,33 / 33,33), virada de ano, dia 31 em mês curto
- `datas.ts`: intervalo "mesmo período do mês anterior" (inclusive 31/03 → 28 ou 29/02), início/fim de mês no fuso de SP
- `comparacao.ts`: variação com anterior = 0, regra de cor para despesa vs. receita
- `dinheiro.ts`: parse de `"1.234,56"` → `123456`, formatação

Nomes dos testes (`describe`/`it`) em português.

---

## 10. Fases de implementação

Faça **uma fase por vez**. Ao final de cada uma:

1. Rode `lint`, `typecheck` e `test` (e `build` quando fizer sentido).
2. **Não faça o commit.** Me explique **o que foi feito**, **o motivo** de cada escolha e **o porquê** (quero entender o código).
3. Me passe os comandos `git add ...` e `git commit -m "..."` prontos (padrão da seção 11) para eu mesmo commitar tudo.
4. Pare e espere eu pedir a próxima fase.

**Fase 0 — Setup**
Next.js + TS strict + Tailwind + shadcn + ESLint/Prettier + Vitest. Drizzle configurado com o Neon. `.env.example`. Tokens de cor do design.
✅ `pnpm dev` sobe; `pnpm db:studio` conecta no Neon.

**Fase 1 — Auth**
Better Auth com e-mail e senha, cadastro desligado, tabelas de auth renomeadas. Script `db:criar-usuario` com seed de categorias. Página de login, botão Sair, proteção das rotas, rate limit.
✅ Consigo criar meu usuário pelo script e entrar; tentativa de cadastro pela API é recusada; senha errada mostra erro genérico; rota protegida sem sessão vai para `/login`.

**Fase 2 — Schema e lógica pura**
Schema, migration inicial, `lib/*` com testes.
✅ Migration aplicada no Neon; testes da seção 9 passando.

**Fase 3 — Lançamentos**
Formulário rápido (Sheet no mobile / Dialog no desktop), Server Actions de criar/editar/excluir (com parcelas), página de lista com filtros.
✅ Consigo lançar, parcelar, editar e excluir pelo celular.

**Fase 4 — Início (dashboard)**
Layout (barra lateral + navegação inferior + cabeçalho), queries de agregação e todos os blocos da seção 5.2, com estados de loading (skeleton) e vazio.
✅ Números conferem com uma soma manual no Drizzle Studio; comparação "mesmo período" correta.

**Fase 5 — Categorias + PWA + Deploy**
CRUD de categorias, `manifest.ts`, ícones, `theme-color`, deploy na Vercel com as env vars, rodar `db:criar-usuario` apontando para o banco de produção.
✅ App instalado na tela inicial do celular funcionando em produção.

> Obs.: a Fase 1 cria a tabela de categorias junto com as de auth (o seed precisa dela). O restante do schema (`lancamentos`) entra na Fase 2.

---

## 11. Convenções

### Idioma do código

- **Domínio em português, sem acento nem ç:** tabelas, colunas, enums e seus valores, variáveis, funções, tipos, componentes, props, chaves de objeto, search params e arquivos de domínio. Ex.: `lancamentos`, `valorCentavos`, `meioPagamento`, `obterResumoMes`, `FormularioLancamento`, `parcelas.ts`.
- **Funções começam com verbo em português:** `obter`, `listar`, `criar`, `editar`, `excluir`, `arquivar`, `formatar`, `calcular`, `gerar`, `validar`.
- **Fica em inglês (nunca traduzir):**
  - Pastas estruturais e de arquitetura (`components`, `server`, `queries`, `actions`, `lib`, `db`, `ui`, `layout`, `tests`, `scripts`) e arquivos de convenção de frameworks (`page.tsx`, `layout.tsx`, `route.ts`, `schema.ts`, `seed.ts`, `manifest.ts`, `drizzle.config.ts`)
  - APIs, hooks e tipos de bibliotecas (`useState`, `revalidatePath`, `pgTable`, `z.object`...), componentes do shadcn em `components/ui/`
  - Termos técnicos consagrados usados como sufixo/prefixo: `id`, `Props`, `Schema` (ex.: `FormularioLancamentoProps`, `lancamentoSchema`), `Pct`
  - Variáveis de ambiente e scripts padrão do `package.json`
- **Textos da interface em português.**

### Git

- Commits em **português**, padrão **Conventional Commits** com o tipo em inglês (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`) e a descrição em português no imperativo/presente. Ex.: `feat: adiciona formulário de lançamento rápido`
- Branches em **kebab-case**, em português, com prefixo do tipo: `feat/formulario-lancamento`, `fix/calculo-parcelas`

### Geral

- Componentes pequenos; Server Components por padrão, `"use client"` só onde há interação
- Sem `any`; tipos inferidos do schema Drizzle (`typeof lancamentos.$inferSelect`)
- Na dúvida sobre uma regra de negócio, **pergunte** em vez de assumir
