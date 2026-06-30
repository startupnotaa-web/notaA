# Nota A — Monorepo

Plataforma gamificada de preparação para o ENEM com IA adaptativa, mobile-first e inclusiva por princípio de arquitetura.

> **Antes de tocar em código**, leia (nesta ordem): [`NotaA_Planejamento_Criacao_Execucao.md`](NotaA_Planejamento_Criacao_Execucao.md) (fonte da verdade de domínio) e [`docs/01`](docs/01-entendimento-produto.md) a [`docs/10`](docs/10-seguranca-e-privacidade.md) (plano de aplicativo).

## Estado atual

🚧 **Fase 0 — passo 1 (bootstrap do monorepo) concluído.** Demais pacotes/apps são **stubs intencionais** — cada `src/` tem um comentário apontando o passo do [`docs/09-estrutura-repositorio.md` §5](docs/09-estrutura-repositorio.md) que o preenche.

## Requisitos

- Node ≥ 20
- pnpm 9 (via `corepack` ou `npm i -g pnpm`)

## Comandos

```bash
pnpm install      # instala todo o workspace
pnpm lint         # ESLint em todos os pacotes/apps
pnpm typecheck    # tsc --noEmit em todos os pacotes/apps
pnpm test         # Vitest nos pacotes que já têm testes
pnpm build        # build (turbo) — no-op até os passos 6/7
```

## Estrutura

Ver [`docs/09-estrutura-repositorio.md`](docs/09-estrutura-repositorio.md) para a árvore completa e a regra de fronteira entre camadas (Apresentação nunca importa `engine-*`/`db`/IA — imposto por ESLint + dependency-cruiser).

## Próximos passos (Fase 0)

1. ~~Bootstrap do monorepo~~ ✅
2. Design tokens + extração dos assets de marca (`2.png` → `apps/web/public/brand/`)
3. Esquema de dados (Drizzle, 37 tabelas) + Supabase/RLS
4. Contracts (Zod) + ports
5. Auth + RBAC
6. Esqueleto NestJS com portão de IA
7. PWA shell
8. Motor TRI mínimo + testes
9. Fatia vertical E1→E2 (onboarding → quiz adaptativo)
