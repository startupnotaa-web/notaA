# Nota A — Documentação Técnica (V2)

> Documento de referência de **como o código funciona hoje**: o que cada camada, app e pacote faz, como os dados fluem e onde encaixar cada mudança. Complementa (não substitui) `NotaA_Planejamento_Criacao_Execucao.md` e a série `docs/01`→`docs/10` (fonte da verdade de domínio).

---

## 1. Visão geral

**Nota A** é uma plataforma gamificada de preparação para o ENEM com IA adaptativa, mobile-first. O produto gira em torno de um **quiz adaptativo** (motor TRI), um **tutor socrático** por IA, **correção de redação**, **gamificação** (XP, níveis, streak, conquistas), e camadas para **professor/escola/família**.

A arquitetura segue **hexagonal / ports-and-adapters** com uma regra de fronteira rígida:

```
Apresentação (Next.js)  →  Orquestração (NestJS API)  →  Motores puros + DB + IA
      apps/web                    apps/api              packages/engines-*, db, prompts
```

- A **Apresentação nunca importa** `engine-*`, `db` ou SDK de IA — só fala com a Orquestração via HTTP (`apiFetch`).
- A **Orquestração** é a única que conhece DB, IA e motores. Cada provedor externo entra por uma **porta** (`LLMProviderPort`, `QuizRepositoryPort`, …); trocar Gemini/Supabase = trocar o adaptador, sem mexer em quem consome.
- Os **motores** (`engine-tri`, `engine-profiler`, `engine-error-detector`) são **TypeScript puro** — sem HTTP, DB ou IA. Determinísticos e testáveis isoladamente.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 3, PWA (Serwist) |
| Backend | NestJS 10 + Fastify, deploy serverless na Vercel |
| Banco | PostgreSQL (Supabase) via Drizzle ORM 0.38.4 |
| Auth | Supabase Auth (JWT) + RBAC próprio |
| IA | Google Gemini (`@google/generative-ai`), modelo default `gemini-2.5-flash` |
| Validação | Zod (schemas compartilhados em `@notaa/contracts`) |
| Observabilidade | Sentry (`@sentry/node`) |
| Monorepo | pnpm workspaces + Turborepo |
| Testes | Vitest |

**Regra de UI (CLAUDE_HANDOFF):** APENAS Tailwind. Zero CSS inline ou arquivos de estilo extras.

---

## 3. Estrutura do monorepo

Raiz do projeto de código: **`notaA/`**. Workspaces definidos em `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `packages/engines/*`.

```
notaA/
├── apps/
│   ├── web/        # Next.js (Apresentação / PWA)
│   ├── api/        # NestJS (Orquestração) — deploy serverless Vercel
│   └── worker/     # Jobs assíncronos (stub — apenas placeholder hoje)
├── packages/
│   ├── contracts/  # Schemas Zod + ports (contrato único web↔api↔motores)
│   ├── db/         # Drizzle: schema (~37 tabelas), client, repositórios
│   ├── engines/
│   │   ├── tri/            # Motor TRI (3PL) — quiz adaptativo
│   │   ├── profiler/       # Perfil cognitivo 4D
│   │   └── error-detector/ # Classificador de padrão de erro
│   ├── prompts/    # Prompts de IA versionados (semver)
│   ├── ui/         # Design system (componentes React + tokens CSS)
│   └── config/     # ESLint base compartilhado
├── docs/           # 01→10: plano de produto/arquitetura/segurança
├── supabase/       # Migrations (Drizzle) + policies RLS
├── turbo.json, pnpm-workspace.yaml, tsconfig.base.json
└── NotaA_Planejamento_Criacao_Execucao.md  # fonte da verdade de domínio
```

**Comandos raiz** (via Turbo): `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

**Overrides pnpm importantes:** `drizzle-orm` fixado em `0.38.4` e `@supabase/supabase-js` em `2.108.2` — evita duas instâncias físicas de tipos incompatíveis (por isso operadores do Drizzle são re-exportados de `@notaa/db`, nunca importados direto de `drizzle-orm` por outros pacotes).

---

## 4. `packages/contracts` — o contrato único

Fonte única de verdade de tipos entre camadas. Nada redefine estes tipos localmente.

- **Schemas Zod** por domínio: `auth`, `jwt`, `onboarding`, `quiz`, `perfil`, `redacao`, `socratic`, `engines`, `study-trails`, `battle`, `simulado`, `class`, `common`, `errors`.
- **Ports** (`ports.ts`): interfaces que a API implementa como adaptadores:
  - `LLMProviderPort` — único ponto de acesso a IA generativa. `complete()` devolve JSON já **validado por schema Zod**; `completeTexto()` devolve texto livre (tutor socrático).
  - `QuizRepositoryPort`, `OnboardingRepositoryPort`, `GamificacaoRepositoryPort`, `ProfilerRepositoryPort`, `DashboardRepositoryPort`, `ErrorDetectorRepositoryPort`, `UsuarioRepositoryPort`, `AuthAdminPort`.
- Os schemas Zod servem duas vezes: validam o **request** (via `ZodValidationPipe` no Nest) e a **resposta da IA** (o adaptador Gemini converte o schema em JSON Schema e valida a saída).

---

## 5. `apps/api` — Orquestração (NestJS)

### 5.1 Bootstrap e deploy

- **Local (`src/main.ts`):** `NestFactory` com `FastifyAdapter`, escuta na `PORT` (default 3001). Inicializa Sentry, loga CORS por request, aplica `CORS_OPTIONS`.
- **Serverless (`api/index.ts`):** entrypoint da Vercel. Faz bootstrap **uma vez** (cache do `app`), chama `instance.ready()` (Fastify precisa compilar rotas), e reemite o request nativo do Node no servidor Fastify. As rotas **não têm prefixo `/api`** — o rewrite da Vercel manda tudo para a function e o Fastify roteia pela URL original.
- **Build Vercel:** `vercel-build` compila os pacotes internos, roda `tsc` e empacota via `esbuild` (`scripts/bundle.mjs`).

### 5.2 Camada comum (`src/common`)

- **Guards globais (ordem importa):**
  1. `AuthGuard` — valida o JWT do Supabase (`verify-jwt.ts`, via `jose`), anexa `request.user` (`{ sub, papel, ... }`). Rotas com `@Public()` passam sem token. Em dev, aceita `x-development-mode` com um `dev-user`.
  2. `RolesGuard` — decide acesso com base em `@Roles('admin' | 'professor' | ...)` lendo `request.user.papel`.
- `AllExceptionsFilter` — padroniza respostas de erro em `{ error: { code, message } }` e loga stack trace.
- `ZodValidationPipe` — valida o body contra o schema Zod do contrato.
- `cors.ts` — política única de CORS. `sentry.ts` — init + filtro de exceções.

### 5.3 Módulos de negócio (`src/modules`)

Cada módulo segue o padrão **controller → service → repository (porta)**, com implementações `*.repository.memory.ts` (in-memory, testes/fallback) e `*.repository.drizzle.ts` (produção). Tokens de DI em `*.tokens.ts`.

| Módulo | Rotas principais | O que faz |
|---|---|---|
| `health` | `GET /health` | Liveness. |
| `auth` | `POST /auth/register`, `/auth/sync-oauth`, `/auth/password-reset` | Registro, sincronização OAuth (grava `app_metadata.papel` via Admin API), reset de senha. `rbac.ts` define os papéis. |
| `auth/me` | `GET /me`, `PATCH /me` | Dados do usuário logado. |
| `onboarding` | `GET /onboarding/state`, `PUT /onboarding/steps/:n`, `POST /onboarding/complete` | Wizard de onboarding; ao concluir, instancia o `PerfilCognitivo4D` inicial. |
| `quiz` | `POST /quiz/sessions`, `/quiz/generate`, `GET /quiz/sessions/:id/next-item`, `POST /quiz/sessions/:id/answers`, `/finish` | **Núcleo do produto** — ver §6. |
| `profiler` | `GET /me/cognitive-profile` | Perfil cognitivo 4D (estilo de aprendizagem). |
| `dashboard` | `GET /me/dashboard` | Resumo combinado: perfil + θ por área + contadores, em uma consulta. |
| `redacao` | `GET /redacao/history`, `POST /redacao`, `GET /redacao/:id` | Envio e correção de redação por IA (5 competências ENEM). |
| `socratic` | `POST /socratic/sessions`, `/messages`, `GET /history`, `POST /socratic/chat` | Tutor socrático (chat com IA guiado pelo perfil do aluno). |
| `study-trails` | `GET /study-trails/generate` | Geração de trilha de estudo. |
| `gamificacao` | `GET /me/xp`, `/streak`, `/achievements`, `POST /me/recover-streak` | XP (ledger append-only), níveis (`nivel.ts`), streak com freeze, conquistas. |
| `error-detector` | (interno, consumido pelo quiz) | Classifica erro em `deslize_atencao` vs `lacuna_conhecimento`. |
| `escola` | `GET /escola/overview`, `/turmas/:id/desempenho` | Visão da gestão escolar. |
| `class` | `GET /class/analytics` | Analytics de turma (professor). |
| `battle` | `POST /battle/matchmake`, `/finish` | Batalha PvP / duelo. |
| `simulado` | `GET /simulado/next-item`, `POST /simulado/import` | Simulado com questões reais do ENEM. |
| `admin` | `GET /admin/users`, `/admin/ai-usage` | Painel admin (uso de IA, usuários). |
| `ai` | `GET /ai/test`, `/ai/ping`, `/ai/models` | **Portão único de IA** — ver §7. Rotas `@Roles('admin')` (consomem cota real). |

### 5.4 Transacionalidade (Unit of Work)

O quiz usa `quiz.unit-of-work.ts`: registrar tentativa + atualizar θ + conceder XP + streak são **atômicos**. Falha no meio reverte tudo (inclusive a tentativa, liberando a idempotency key para reenvio). Análises derivadas (profiler, error-detector) rodam **fora** da transação — nunca bloqueiam a resposta ao cliente.

---

## 6. Fluxo do Quiz Adaptativo (o coração do produto)

`quiz.service.ts` orquestra dois caminhos:

### 6.1 Quiz por banco de itens (TRI adaptativo)

1. **`startSession(estudante, area)`** — busca o θ (theta) do aluno na área e o pool de itens; `selectNextItem` escolhe o item de **máxima informação de Fisher** no θ atual (método padrão de CAT — testes adaptativos computadorizados). Cria a sessão e devolve a 1ª questão **sem gabarito**.
2. **`nextItem`** — repete a seleção excluindo itens já expostos.
3. **`submitAnswer`** (idempotente via header `Idempotency-Key`):
   - Compara resposta com gabarito → `acerto`.
   - Dentro da UoW: grava tentativa, atualiza θ (`motorTRI.updateAbility` — passo de Newton escalado pela informação de Fisher), concede XP (**acerto=15, erro=5**), registra atividade válida (streak).
   - **Itens não calibrados** (ex.: gerados por IA) **não movem θ** — só itens calibrados alimentam a estimativa de habilidade.
   - Fora da UoW: atualiza o profiler cognitivo e, se errou, classifica o erro (`errorDetector`).
   - Devolve feedback + próxima questão (ou `null` se o pool esgotou).

**Motor TRI** (`packages/engines/tri`, modelo 3PL de Birnbaum, métrica logística sem D=1,7):
- `model.ts` — `probabilidadeAcerto` (3PL: `c + (1-c)/(1+e^(-a(θ-b)))`), `informacaoFisher`, `clampTheta` (θ ∈ [-4, 4]).
- `select-next-item.ts` — máxima informação; `PoolEsgotadoError` quando não há candidato.
- `update-ability.ts` — atualização incremental de θ (stateless; `erroPadrao` é aproximação de 1 item).

### 6.2 Quiz gerado por IA

`generateQuiz` monta contexto (proficiência convertida de θ para escala 0–100, nível de gamificação, perfil cognitivo, **histórico das últimas 8 perguntas** para anti-repetição), monta o prompt via `@notaa/prompts` e chama a IA com `temperature: 1.1` (reduz colisão com o histórico). A resposta é **validada por schema Zod** (`GenerateQuizResponseSchema`). Se a IA falhar, lança `AI_ERROR` explícito — **não silencia com mock**. Cada enunciado gerado é registrado para o anti-repetição futuro.

Quando o pool TRI esgota (`getOrGenerateNextItem`), o serviço gera um item por IA com parâmetros TRI "chutados" e marcado `naoCalibrado: true` (entra no fluxo mas não move θ).

---

## 7. Integração de IA (portão único)

`src/modules/ai` — **nenhum outro módulo importa SDK de IA**; tudo passa pelo token `LLM_PROVIDER`.

- **`GeminiAdapter`** — implementação real do `LLMProviderPort`:
  - `complete()` — força `responseMimeType: "application/json"`, converte o schema Zod em JSON Schema, e **valida a saída com Zod** (falha explícita se o contrato quebrar).
  - `completeTexto()` — texto livre (tutor socrático).
  - `comRetry()` — backoff exponencial para erros **transitórios** (429/5xx/rede); erros de contrato/config sobem na 1ª tentativa. Timeout configurável (`GEMINI_TIMEOUT_MS`, default 15s).
  - `ping()` / `models()` — diagnóstico de qual modelo a chave atende com cota.
- **`LlmUsageLoggerProvider`** — é o provider registrado no token (decora o `GeminiAdapter`): registra tokens/custo/latência por usuário e integração em `log_uso_ia`.
- **`LLMProviderMock`** — mesma interface para testes/dev sem cota.
- **`ContextBuilderService` / `StudentContextService`** — montam o pacote de contexto (perfil 4D + adaptações + objetivo do aluno) que vai à IA. **O cliente nunca monta contexto.**
- **`RiskDetectorService` / `CareNotifierService` / `risk.repository.ts`** — detecção de sinais de risco socioemocional nas conversas e notificação de cuidado.
- **`guardrails.ts`** — filtros pós-LLM (segurança de conteúdo).
- **`rate-limiter.interceptor.ts`** — limita chamadas de IA por usuário.

Config via ambiente: `GEMINI_API_KEY` (obrigatória), `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`.

---

## 8. `packages/db` — dados (Drizzle + Supabase)

Schema em `src/schema/` (~37 tabelas), agrupado por contexto conforme `docs/04`:

- **`identidade.ts`** — `escola`, `usuario`, `turma`, `matriculaTurma`, `vinculoResponsavel`.
- **`perfil.ts`** — `perfilOnboarding`, `dadoSensivelEstudante`, `perfilCognitivoEvento`, `adaptacaoAtiva`.
- **`tri.ts`** — `bancoDeItens`, `habilidadeEstudante`, `tentativaResposta`, `thetaEvento` (append-only).
- **`erro.ts`** — `ocorrenciaErro`.
- **`estudo.ts`** — redação (`temaRedacao`, `redacao`, `rubricaRedacao`, `avaliacaoRedacao`, `avaliacaoCompetencia`), socrático (`conversaSocratica`, `mensagemSocratica`), risco (`ocorrenciaRisco`, `notificacaoCuidado`).
- **`gamificacao.ts`** — `xpLedger` (append-only), `streak`, `conquista`, `conquistaConcedida`, `duelo`, `duelParticipante`, `rankingSnapshot`, `batalhaPvp`.
- **`comercial.ts`** — `plano`, `assinatura`, `promptVersionado`, `logUsoIa`, `contadorRateLimit`, `logAuditoriaAdmin`.
- **`questoes.ts`** — `questoesEnem` (banco de questões reais).
- **`study-trails.ts`** — `trilhaEstudo`.
- **`enums.ts`** — ~20 enums (`area_conhecimento`, `erro_classificacao`, `xp_origem`, `risco_severidade`, `plano_tipo`, etc.).

**Repositórios** (`src/repositories/`) implementam as portas do contrato com Drizzle: `quiz`, `dashboard`, `error-detector`, `gamificacao`, `profiler`, `usuario`.

**Princípios de dados:** ledgers **append-only** (XP, θ-eventos, ocorrências de erro/risco) — nunca UPDATE/DELETE; idempotência por chave; `nao_calibrado` marca parâmetros TRI não validados.

**Migrations** (`supabase/migrations/`): 0000→0009, geradas pelo Drizzle Kit, com snapshots em `meta/`. **RLS** em `supabase/policies/` (`0001_rls_estudante.sql`, `0002_rls_restante.sql`) — estudante só acessa o próprio; a Orquestração sempre deriva `estudanteId` do JWT, nunca do body.

---

## 9. `apps/web` — Apresentação (Next.js PWA)

### 9.1 Estrutura (App Router)

Rotas agrupadas por acesso:
- **`(public)/`** — `login`, `cadastro`, `planos`, landing.
- **`onboarding/`** — wizard pós-cadastro.
- **`(estudante)/`** — área logada do aluno: `dashboard`, `quiz`, `simulado`, `redacao`, `tutor`, `trilhas`, `estudo`, `arena`, `batalha-coletiva`, `mapa-conhecimento`, `previsao-nota`, `certificados`, `comunidade`, `minha-narrativa`, `relatorio-familiar`, `perfil`, `escola`.
- **`(professor)/professor/`** — painel do professor (`RiskBadge`).

### 9.2 Navegação e shell

- `app/layout.tsx` (raiz) — tema escuro default (`data-theme="dark"`), PWA manifest, `AuthProvider`, `ErrorSuppressor`.
- `(estudante)/layout.tsx` — guard de sessão (redireciona para `/login` se não logado), envolve tudo em `UserProvider` + `AppShell`.
- **`AppShell.tsx`** — `TopBar` (logo, nível, XP em barra de progresso, streak 🔥, badge Free/PRO) + `BottomNav` com **5 hubs** (Início, Trilha, Estudo, Arena, Perfil), +Escola condicional. Toda a navegação é centralizada aqui (regra: nada de `<TopBar/>` em páginas individuais).

### 9.3 Camada de dados do frontend (`lib/`)

- **`api-client.ts`** — `apiFetch<T>()`: **único** ponto de comunicação com a API. Anexa o JWT da sessão Supabase, trata `//` na URL (evita 308 da Vercel), classifica erros de rede/extensão, lança `ApiError` tipado.
- **`auth-context.tsx`** — `AuthProvider`/`useAuth`: gerencia sessão Supabase, `onAuthStateChange`, redirecionamento pós-login (dashboard se tem `papel`, senão onboarding via `post-auth`), `signOut` limpa snapshot do usuário. Desregistra Service Workers em dev.
- **`user-context.tsx`** — `useUser`: XP, nível, streak, papel, perfil/plano (consumido pelo `AppShell`).
- **`supabase-browser.ts`** — client Supabase do navegador.
- **`post-auth.ts`** — `garantirRegistro()` (sync OAuth).
- **`storage-keys.ts`** — chaves de `localStorage`.

### 9.4 PWA

`app/sw.ts` (Serwist), `public/manifest.webmanifest`, ícones/splash em `public/brand/`. Config em `next.config.mjs` (`@serwist/next`).

---

## 10. `packages/ui` — Design System

Componentes React puros (só Tailwind): `Button`, `Card`, `Badge`, `Chip`, `Input`, `Label`, `OptionCard`, `Progress`, `SectionHeader`, `Skeleton`, `Stat`, `Switch`. Utilitário `cn.ts` (merge de classes). **Tokens CSS** em `src/tokens/` (`colors`, `typography`, `spacing`, `motion`) — tema escuro é o default da marca. Cores/gradientes referenciados via classes Tailwind (`bg-brand`, `text-text-muted`, `bg-gradient-brand`, etc.).

---

## 11. Autenticação e RBAC

1. Usuário autentica no **Supabase Auth** (email/senha ou OAuth) → recebe JWT.
2. O frontend anexa o JWT em toda chamada (`apiFetch`).
3. `AuthGuard` valida o JWT (`jose`) e anexa `request.user`.
4. `RolesGuard` + `@Roles(...)` autorizam por papel.
5. O papel (`usuario.tipo_perfil`: estudante, professor, gestor, responsavel, admin) é gravado em `app_metadata.papel` pela API (Admin API / service role) no registro/sync OAuth — só a API escreve isso.

Segurança: `estudanteId` sempre vem do JWT (`req.user.sub`), nunca do body/params; erros de acesso a recurso alheio retornam **404** (não 403) para não confirmar existência; RLS no banco como defesa em profundidade.

---

## 12. `apps/worker` e `packages/prompts` / `config`

- **`worker`** — stub (`src/placeholder.ts`). Destinado a jobs assíncronos (rankings, notificações, recálculos) — ainda não implementado.
- **`prompts`** — prompts de IA **versionados** (semver). `montarPromptQuiz(...)` e `PROMPT_QUIZ_TEMPLATE` são consumidos pelo quiz; a versão é registrada em `log_uso_ia` para auditoria.
- **`config`** — ESLint base compartilhado (`eslint.base.mjs`) que impõe a regra de fronteira entre camadas.

---

## 13. Estado atual e pontos de atenção

Segundo `CLAUDE_HANDOFF.md`, tarefas/bugs prioritários em aberto:
1. **Hydration mismatch** ao salvar aba ativa no `localStorage` (tela reseta no refresh).
2. Remover `<TopBar/>` duplicados em páginas — centralizar só no `AppShell`/layout raiz.
3. **Quiz IA:** já corrigido no código atual (força `responseMimeType: "application/json"`, passa histórico do aluno para exigir questões inéditas, lança `AI_ERROR` em vez de mock).
4. **Dashboard:** garantir refetch/reatividade do Mapa Cognitivo após resolver questões.

Áreas com implementação `memory` (não-Drizzle) ainda em transição para produção: `quiz`, `dashboard`, `gamificacao`, `profiler`, `error-detector`, `auth` (repos memory coexistem com os drizzle).

---

## 14. Como rodar

```bash
# na raiz notaA/
pnpm install          # instala o workspace inteiro
pnpm dev              # sobe web + api (turbo, persistente)
pnpm lint             # ESLint (impõe fronteira entre camadas)
pnpm typecheck        # tsc --noEmit em tudo
pnpm test             # Vitest
```

Variáveis de ambiente: ver `.env.example` e `.env.production.example`. Essenciais: `GEMINI_API_KEY`, `NEXT_PUBLIC_API_URL`, credenciais Supabase (URL, anon key, service role), `SENTRY_DSN`.

Seeds: `pnpm --filter @notaa/api seed:enem` (questões ENEM), `scripts/seed-conquistas.ts` (catálogo de conquistas).

---

## 15. Onde encaixar uma mudança (guia rápido)

| Quero… | Mexo em… |
|---|---|
| Novo endpoint de negócio | `apps/api/src/modules/<mod>/` (controller + service + repo + token) |
| Novo tipo/contrato compartilhado | `packages/contracts/src/` (e re-exportar no `index.ts`) |
| Nova tabela / coluna | `packages/db/src/schema/` + gerar migration Drizzle + policy RLS |
| Mudar regra de quiz/TRI | `packages/engines/tri/` (puro) ou `quiz.service.ts` (orquestração) |
| Trocar/ajustar IA | `apps/api/src/modules/ai/` (adaptador) — nada mais muda |
| Ajustar prompt | `packages/prompts/` (subir a versão semver) |
| Nova tela | `apps/web/app/(grupo)/<rota>/page.tsx` + `apiFetch` |
| Novo componente visual | `packages/ui/src/components/` (só Tailwind) |
```
