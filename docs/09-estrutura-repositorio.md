# 09 — Estrutura do Repositório & Primeiros Passos

> Árvore do monorepo refletindo as camadas do [doc 03](03-arquitetura.md), e a **ordem concreta** dos primeiros passos (Fase 0). Stack do [doc 02](02-stack-e-justificativa.md). _Nada aqui é executado ainda — é o plano de scaffolding, a ser aprovado no Passo 4._

---

## 1. Árvore proposta (monorepo pnpm + Turborepo)

```text
notaa/
├─ apps/
│  ├─ web/                      # Apresentação — PWA Next.js (Estudante, Escola, Admin, Landing)
│  │  ├─ public/brand/          # assets extraídos de 2.png (logo-mark.svg, icons, splash, maskable)
│  │  ├─ app/                   # rotas (App Router): (public), (estudante), (escola), (admin)
│  │  └─ src/{components,features,lib,styles}/
│  ├─ api/                      # Orquestração — NestJS (Guards=RBAC, Interceptor=portão de IA)
│  │  └─ src/modules/{auth,onboarding,quiz,profiler,dashboard,redacao,socratic,gamificacao,escola,admin,ai}/
│  │     └─ ai/{context-builder,rate-limiter,prompt-registry,risk-detector,providers}/
│  └─ worker/                   # Jobs assíncronos pg-boss (correção de redação, lotes do Profiler)
│
├─ packages/
│  ├─ engines/                  # DOMÍNIO — TS puro, SEM infra (testável/portável)
│  │  ├─ tri/                   # Motor TRI (3PL, seleção adaptativa, θ)
│  │  ├─ profiler/              # Cognitive Profiler (4D)
│  │  └─ error-detector/        # Detector de Padrão de Erro
│  ├─ contracts/               # Schemas Zod + DTOs + PORTS (RepositoryPort, LLMProviderPort)
│  ├─ db/                      # Drizzle schema + migrations + repositórios (adaptadores)
│  ├─ ui/                      # Design System (tokens do doc 07, componentes shadcn)
│  ├─ prompts/                 # Prompts de sistema VERSIONADOS (Socrática, Corretor) + dicas estáticas
│  └─ config/                  # tsconfig, eslint, env schema (Zod), constantes compartilhadas
│
├─ supabase/
│  ├─ migrations/              # SQL (gerado do Drizzle) — fonte de schema versionada
│  └─ policies/                # RLS por tabela (doc 10)
│
├─ docs/                       # 01..10 (este planejamento)
├─ .github/workflows/          # CI: lint, typecheck, test, a11y, deploy
├─ turbo.json · pnpm-workspace.yaml · package.json · .env.example · README.md
```

## 2. Por que esta árvore (mapeamento às camadas)

| Camada (doc 03)     | Onde vive                              | Regra de fronteira                                                                 |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Apresentação        | `apps/web`                             | Importa só `packages/{ui,contracts}`. **Proibido** importar `engines`, `db`, `ai`. |
| Orquestração        | `apps/api`                             | Único que injeta `engines` + `ai` + `db`.                                          |
| Domínio/Motores     | `packages/engines`                     | **Zero** dependências de infra (sem Nest/Drizzle/SDK de IA).                       |
| Integração de IA    | `apps/api/.../ai` + `packages/prompts` | SDK de IA isolado aqui; portão único.                                              |
| Persistência        | `packages/db` + `supabase/`            | Implementa `RepositoryPort`.                                                       |
| Worker (assíncrono) | `apps/worker`                          | Reusa `engines` + `ai`; consome fila.                                              |

**Fronteiras impostas por ferramenta** (não só convenção): regras ESLint `no-restricted-imports` + **dependency-cruiser** no CI bloqueiam `web → engines/db/ai`. Assim o desacoplamento do doc 02 §4 é verificável.

## 3. Contratos e tipos compartilhados

- `packages/contracts` é a **fonte única** de DTOs/validação (Zod) — web e api importam os mesmos schemas (inclui o schema de saída do Corretor e a união discriminada da Socrática).
- Tipos do banco gerados do Drizzle ficam em `packages/db`; o domínio (`engines`) **não** depende deles — usa tipos próprios de `contracts`.

## 4. Ambiente e segredos

- `.env.example` versionado; segredos reais **nunca** commitados.
- Validação de env por Zod em `packages/config` (a app não sobe com env inválida).
- Variáveis por escopo: `web` (públicas `NEXT_PUBLIC_*` + URL da API), `api`/`worker` (service role do Supabase, chave do provedor de IA, Sentry DSN).

## 5. Ordem concreta dos primeiros passos (Fase 0)

> Cada passo é uma entrega pequena e verificável. **Aguardar aprovação do Passo 4** antes de iniciar.

1. **Bootstrap do monorepo** — pnpm workspaces + Turborepo; `config` (tsconfig/eslint/prettier); CI mínimo (lint+typecheck).
2. **Design tokens + assets de marca** — `packages/ui` com os tokens do doc 07; **extrair recortes de `2.png`** para `apps/web/public/brand/` (logo, favicon, ícones PWA, splash).
3. **Esquema de dados** — `packages/db` (Drizzle) com as 37 tabelas do doc 04 → migrations → projeto Supabase (região São Paulo) + **RLS inicial** (doc 10).
4. **Contracts base** — `packages/contracts` com schemas Zod das entidades núcleo + ports.
5. **Auth + RBAC** — Supabase Auth no `web`; Guards de papel no `api`; `/me`.
6. **Esqueleto do `api`** — NestJS com módulos vazios + **Interceptor do Rate Limiter** e **AuthGuard/RoleGuard** já plugados (portão de IA pronto antes de existir IA).
7. **PWA shell** — `apps/web` com App Shell (nav inferior, barra superior, barra de XP), tema escuro default, manifest + service worker (Serwist).
8. **Motor TRI mínimo** — `packages/engines/tri` (3PL + seleção) com testes unitários; itens `nao_calibrado` (Q-02).
9. **Fatia vertical E1→E2** — onboarding incremental + 1 quiz adaptativo gravando `TentativaResposta`/θ → valida a fundação ponta a ponta.

**Saída da Fase 0:** login + onboarding salvando incremental + TRI selecionando/pontuando item, com schema migrado e CI verde. Em seguida, Fase 1 (E2/E3/E4/E9) busca a **métrica norte**.

## 6. Convenções de trabalho

- **Commits/PRs pequenos** por história; PR roda lint+typecheck+test+a11y+dependency-cruiser.
- **Migrations versionadas** (nunca alterar migration aplicada; criar nova).
- **Seeds** de catálogo: `plano`, `conquista`, `rubrica_redacao` (v1), `prompt_versionado` (v1).
- **Feature flags** para mecânicas de gamificação por fase (doc 08 §6).
