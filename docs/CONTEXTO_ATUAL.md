# Contexto Atual do Nota A

> **Data de referência:** 2026-10-16
> **Branch:** `main` (último merge: PR #9, commit `0f51d39`, 2026-10-07)
> **Para quem:** quem vai retomar o projeto (humano ou agente) e precisa saber, em uma leitura, onde o código está, o que já foi feito e o que falta.
> **Substitui como ponto de entrada:** `README.md` (bloco "Estado atual" está desatualizado) e `CLAUDE_HANDOFF.md` (lista de bugs de jul/2026, já superada). Os documentos de domínio continuam válidos.

---

## 1. O que é o produto

Plataforma gamificada de preparação para o ENEM, com IA adaptativa, mobile-first e inclusiva por princípio de arquitetura.

- **Aluno (estudante):** onboarding de perfil, quiz adaptativo (TRI), Mapa Cognitivo 4D, previsão de nota, redação com correção por IA, tutor socrático, simulado, trilhas de estudo, certificados, relatório familiar.
- **Professor:** painel próprio com gestão de turmas e anos letivos. Entra por **convite gerado pela instituição** (link), sem autocadastro.
- **Instituição:** gestão de professores, turmas e desempenho agregado.
- **Admin:** rotas `@Roles('admin')`, painel mínimo.

Fonte da verdade de domínio: [`NotaA_Planejamento_Criacao_Execucao.md`](../NotaA_Planejamento_Criacao_Execucao.md). Plano de aplicativo: [`docs/01`](01-entendimento-produto.md) a [`docs/10`](10-seguranca-e-privacidade.md).

## 2. Stack e estrutura do monorepo

| Camada | Tecnologia |
|---|---|
| Web | Next.js 15 (App Router), React 19, Tailwind CSS 3, PWA com Serwist |
| API | NestJS 10 sobre Fastify, Zod, Sentry, deploy serverless (Vercel) |
| Banco | Supabase (Postgres) + Drizzle ORM, RLS habilitado |
| Auth | Supabase Auth (JWT verificado na API) |
| IA | Google Gemini via `@google/generative-ai`, atrás da porta `LLMProvider` |
| Monorepo | pnpm 9 + Turborepo |

```
apps/
  web/        Next.js (estudante, professor, instituição, público, onboarding)
  api/        NestJS (módulos por domínio, guards, rate limit, Sentry)
  worker/     consumidor da fila de importação (tabela `importacao`)
packages/
  contracts/  schemas Zod compartilhados (quiz, redação, simulado, turma, instituição...)
  db/         schema Drizzle, repositórios, scripts de migração
  engines/
    tri/              motor TRI (seleção de item e atualização de theta)
    profiler/         Cognitive Profiler 4D
    error-detector/   classificação lacuna vs. deslize
    grading/          regra avaliativa: nota do período, média, recuperação, situação
  importacao/ leitura, plano e exportação de planilhas (puro)
  prompts/    prompts versionados (ex.: bloco-aluno)
  ui/         componentes e tokens de design
  config/     ESLint/TS base
supabase/
  migrations/ 0000 a 0014 (+ meta/ com snapshots e _journal)
  policies/   RLS por papel
docs/         documentação de arquitetura e produto
```

**Regra de fronteira:** a camada de apresentação nunca importa engines, `db` nem IA diretamente. Isso é imposto por ESLint (e dependency-cruiser, conforme doc 09).

## 3. Estado por área

### Concluído (confirmado pelo histórico e pela árvore do repo)

- **Monorepo e tooling:** workspace, lint verde no web (`204f33d`), typecheck e testes via Turbo.
- **Banco:** 15 migrações (0000–0014). Destaques:
  - 0011: batalhas PvP (tabelas presentes, feature desligada).
  - 0012: renomeação "escola" → "instituição" em todo o schema (decisão de 2026-10-01 registrada em `perfis-decisoes.md`).
  - 0013: instituições, turmas, matrícula em turma, professores, ano letivo.
  - 0014: convite de professor por link.
- **Auth e onboarding:** fluxo com confirmação de e-mail. Corrigido o bug em que professor e instituição caíam no hub do aluno após confirmar (`cebd4b5`). Onboarding salva incremental; bloqueio de dados de neurodivergência para menores de 18 (consentimento parental, LGPD/ECA).
- **Painel do professor:** tela independente com gestão de turmas e anos letivos (`204f33d`).
- **Motor TRI e quiz:** resposta registrada em transação (`uow.run`), com theta, XP e streak atômicos. Itens gerados pela IA têm flag `naoCalibrado` que impede a atualização do theta (E8 de `AUDITORIA_GERAL.md`).
- **Socrática:** guardrail I3 (não entregar resposta direta) e triagem de risco (I6) aplicados.
- **Rate limit:** persistido em `contador_rate_limit`, com limites por plano. Fail-open se o banco cair.
- **Gemini:** retry com backoff e timeout (`GEMINI_TIMEOUT_MS`).
- **Observabilidade:** Sentry na API e log de uso de IA por chamada.
- **Segurança:** rotas de diagnóstico de IA protegidas por `@Roles('admin')`; scripts com credenciais removidos do repo; RLS em todas as tabelas.
- **Feature flags:** módulo Arena (PvP, batalha coletiva, comunidade) desligado por padrão.

Base do relatório: `docs/CONTEXTO_ANTIGRAVITY.md` (22/07) e `docs/AUDITORIA_GERAL.md` (03/07). **Não reverifiquei item a item nesta data.** Trate as afirmações acima como "reportado como feito", e confirme antes de depender de alguma delas.

### Parcial ou pendente

| Item | Situação |
|---|---|
| **Logs do ErrorSuppressor** | O componente suprime erros de extensões de navegador, mas não registra o que suprimiu (E14). Dificulta debug. |
| **Calibração TRI** | Parâmetros e mapa θ→nota ainda são heurísticos (Q-02, Q-06). |
| **Perfis 4D** | Parametrização de calibração pendente (Q-05/Q-02). |
| **Study Trails** | Ainda há fallback por *string-match* de mensagem de erro (`study-trails.service.ts`). Se o texto do erro mudar, o fallback quebra. |
| **Redação** | Erro de IA ainda cai em `falha` com log, mas o status pode ser mais granular (E6). |
| **Worker** | Consome a fila de importação. Hospedagem em aberto (a API é serverless). |
| **Migração 0015** | Gestão Acadêmica, Fase 1. Escrita e testada em PGlite, **não aplicada** no Supabase. Falta também o bucket `importacoes`. |
| **Web: 0 testes** | Não há suíte de testes para o web. Existem testes em contracts, engines, api (vertical slice, chat direto, rota/roles). |
| **Guardrails como gate de CI** | G-CI-1 a G-CI-4 do roadmap (`docs/08`): verificar quais estão no pipeline. |
| **Duelo PvP / batalhas coletivas** | Infra de matchmaking em tempo real não pronta. Ficam ocultos por feature flag. |
| **Painel dos pais, portal da escola/instituição, painel admin** | Existem páginas, mas o escopo mínimo do roadmap (Fase 4) ainda está em andamento. |

### Divergências conhecidas entre documentos

- **`README.md`** diz "Fase 0, passo 1 concluído". Está muito atrás do estado real. Atualizar.
- **`CLAUDE_HANDOFF.md`** fala em 5 hubs (Início, Trilha, Estudo, **Arena**, Perfil). A Arena está oculta por flag, então a navegação atual é diferente.
- **`perfis.md` vs `perfis-decisoes.md`:** decisões de perfil de instituição e professor. Consulte `perfis-decisoes.md` como registro mais recente.
- **Termo "escola":** proibido no produto e no banco. Use "instituição".

## 4. Regras de trabalho que valem para qualquer mudança

1. **Tailwind apenas.** Sem CSS inline nem arquivos de estilo extras. Preservar o design atual (`docs/07`).
2. **IA nunca decide o que é determinístico.** TRI, XP, streak e perfil são domínio puro. A IA gera conteúdo e feedback, e tudo que ela produz passa por schema Zod. Itens gerados pela IA entram com `naoCalibrado`.
3. **Socrática não entrega resposta direta** antes de pelo menos uma pergunta-guia (I3). Mudança nesse fluxo precisa de teste.
4. **Sem segredo no git.** Nada de connection string ou chave em arquivo de teste.
5. **RBAC e RLS** verificados para cada recurso novo (doc 10).
6. **Termos:** "instituição", nunca "escola". Respeitar a linguagem de `perfis-decisoes.md`.
7. **Gamificação inclusiva:** progresso individual antes de comparação. Rankings e duelos são opcionais. Streak não pune um dia isolado de forma desproporcional.
8. **Dados de menores:** neurodivergência só com consentimento parental. Ver doc 10.

## 5. Como rodar

```bash
pnpm install        # Node >= 20, pnpm 9
pnpm lint
pnpm typecheck
pnpm test           # Vitest nos pacotes com testes
pnpm build          # Turbo
```

Variáveis de ambiente relevantes (confirmar nos `.env` locais, que não estão versionados):

- `NEXT_PUBLIC_FEATURE_ARENA` (web) e `FEATURE_ARENA` (API): ligam a Arena. Padrão desligado.
- `GEMINI_API_KEY`, `GEMINI_TIMEOUT_MS`, `LLM_PROVIDER`: IA. Com `LLM_PROVIDER` ausente, o padrão é o mock.
- Credenciais do Supabase (URL, chaves publishable e service role). Nunca commitar.

Seed de dados: `apps/api` tem `seed:enem` e `scripts/seed-conquistas.ts`.

## 6. Próximos passos sugeridos

Ordem por impacto, não por tamanho:

1. **Fechar o gap de observabilidade:** registrar o que o ErrorSuppressor suprime (E14).
2. **Remover o string-match do Study Trails** e tratar erro de IA por tipo (timeout, 429, schema inválido).
3. **Reverificar a auditoria:** rodar uma varredura nos itens E1–E14 e R1–R8 e marcar o que de fato está fechado. Atualizar `CONTEXTO_ANTIGRAVITY.md` ou substituí-lo por este.
4. **Testes no web** para o fluxo de auth/rota inicial (o bug de `cebd4b5` não tinha teste).
5. **Atualizar `README.md`** com o estado real e apontar para este documento.
6. **Calibração TRI** (Q-02/Q-06) com dados reais de uso, quando houver volume.
7. **Fase 4 do roadmap** (portal da instituição, painel admin, painel dos pais), conforme prioridade do produto.

## 7. Histórico recente

| Data | Commit / PR | O que mudou |
|---|---|---|
| 2026-10-16 | branch `feat/gestao-academica-fase1` | Gestão Acadêmica Fase 1: motor de notas, migração 0015 com RLS, API acadêmica e de importação, worker, telas. Ver `perfis-decisoes.md`. |
| 2026-10-07 | `0f51d39` (PR #9) | Correção do redirecionamento pós-confirmação de e-mail para professor e instituição |
| 2026-10-0x | `204f33d` (PR #8) | Painel do professor independente, gestão de turmas, lint verde no web |
| 2026-10-01 | `eac9441` | Estrutura de instituições, turmas e professores; Arena oculta |
| anterior | `7ddb1ef` | Prompts personalizados por aluno com bloco de perfil unificado |
| 2026-07 | `de2f5a0` | Correção do fluxo de confirmação de e-mail |
| 2026-07 | `fca5794` | RLS habilitado em 45/45 tabelas (fecha vazamento via anon key) |

---

## Perguntas em aberto

Estas decisões não estão nos documentos, e a resposta muda o próximo passo:

- A Arena (PvP, batalha coletiva, comunidade) deve voltar para o público em qual fase?
- Quem é o destinatário do protocolo de cuidado em sinais de risco (Q-01)? O default atual é CVV/188 com escalonamento.
- Existe pipeline de CI rodando os guardrails de IA (G-CI-1) e o teste de RBAC/RLS (G-CI-3)? Não consegui confirmar só pelo repo.
