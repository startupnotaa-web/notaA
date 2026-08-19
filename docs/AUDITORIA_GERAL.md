# AUDITORIA GERAL — Plataforma do Nota A

> **Data:** 2026-07-03
> **Escopo:** auditoria profunda pós-migração Claude Code → Antigravity. Somente investigação e documentação — **nenhum código foi alterado**.
> **Referências de arquitetura pretendida:** `CLAUDE_HANDOFF.md`, `NotaA_Planejamento_Criacao_Execucao.md`, `docs/01..10`.
> **Nota de escopo:** `docs/INVENTARIO.md` e `CLAUDE.md` **não existem** no repositório (o pedido original os citava). O mapa do projeto foi reconstruído a partir dos documentos acima e da leitura direta do código.
> **Método:** 3 varreduras paralelas (integração IA/Gemini; motores de domínio + persistência; frontend/auth/segurança/deploy) + verificação manual (spot-check) de todos os achados críticos — os itens marcados ✅ foram confirmados por leitura direta do arquivo citado.

---

## Sumário executivo

| Severidade | Qtde | Destaques |
|---|---|---|
| **Crítico** | 7 | Credenciais de banco commitadas; guardrail socrático I3 ausente na rota `/socratic/chat`; rotas públicas consumindo Gemini; `submitAnswer` sem transação; Gemini sem timeout/retry; contrato `dica_perfil` inconsistente |
| **Alto** | 10 | Rate limiter em memória; parâmetros TRI chutados em itens de IA; dados perdidos na persistência; CORS divergente; dev auth bypass; consentimento LGPD sem validação |
| **Médio** | 8 | Duplicidade de caminhos de IA; catches silenciosos; código morto (protótipos `NotaA_*`, `/preview/*`); mocks divergentes; observabilidade ausente |
| **Baixo** | 5 | Prompts sem versionamento; notificação de risco pendente; comentários desatualizados |

**Estado geral:** a arquitetura de domínio (motores TS puros, schema Drizzle, contratos Zod) é sólida e fiel ao planejamento. Os problemas concentram-se em (a) **resquícios da migração** — dois caminhos paralelos de integração com IA, arquivos de teste com segredos, protótipos monolíticos mortos — e (b) **robustez de produção** — ausência de transações, timeouts e rate limiting persistente. Nenhum repositório em memória está ativo em produção (risco que existia foi verificado e descartado).

---

# PARTE 1 — Erros atuais (bugs reais, já acontecendo)

## 1.1 Integração Gemini / Tutor Socrático

### E1. ✅ [CRÍTICO] Guardrail I3 ("nunca entrega resposta direta") ausente na rota `POST /socratic/chat`
- **Arquivos:** `apps/api/src/modules/socratic/socratic.service.ts:43-62` (`chatDireto`) vs `:142` e `:162` (`enviarMensagem`)
- **Problema:** o método `chatDireto` faz a triagem de risco da entrada (I6 ✅), mas devolve a resposta **bruta** do Gemini ao aluno, sem passar por `contemRespostaDireta()` (guardrail I3) nem validar contra `SocraticResponseSchema` (I5). A rota persistida `enviarMensagem` aplica ambos. O doc 06 §2.3 define I3 como comportamento **inegociável**.
- **Causa raiz:** duas rotas paralelas de tutoria — a stateful (era Claude Code, com sessão persistida) e a stateless (adicionada depois, era Antigravity) — sem replicar os guardrails na segunda.
- **Impacto:** um aluno que pedir "me dá a resposta" no chat direto **recebe a resposta direta**, quebrando a garantia pedagógica central do produto. Também não há registro em `ConversaSocratica` (fluxo não auditável).

### E2. ✅ [CRÍTICO] Credenciais do banco de produção commitadas no git
- **Arquivos:** `apps/api/test-sni.ts:2` (connection string completa com usuário e **senha** do Transaction Pooler Supabase — confirmado), `apps/api/test-sni.js`, `apps/api/test-db.js`, `packages/db/test-db.js` — todos rastreados pelo git (`git ls-files` confirma).
- **Causa raiz:** scripts ad-hoc de teste de conexão criados durante debugging da migração e commitados sem gitignore.
- **Impacto:** qualquer pessoa com acesso ao repositório (ou a qualquer clone/fork/histórico) tem acesso direto ao banco de produção — incluindo dados de menores. A senha está no **histórico** do git, não só no HEAD.

### E3. ✅ [CRÍTICO] Rotas de diagnóstico públicas que consomem o Gemini
- **Arquivo:** `apps/api/src/modules/ai/ai.controller.ts` — `GET /ai/test`, `GET /ai/ping`, `GET /ai/models`, todas com `@Public()`
- **Problema:** qualquer pessoa não autenticada pode disparar chamadas reais ao Gemini (`/ai/test` e `/ai/ping` executam `generateContent`; `/ai/models` chama a API do Google com a `GEMINI_API_KEY` na query string). As rotas devolvem mensagens de erro cruas do Google (vazamento de detalhes de conta/quota).
- **Causa raiz:** rotas de fumaça criadas para diagnosticar a integração em produção ("sem precisar redeployar", segundo os comentários) e nunca removidas/protegidas.
- **Impacto:** abuso de quota e custo de IA sem limite por terceiros; superfície de reconhecimento (enumeração de modelos disponíveis na conta).

### E4. ✅ [CRÍTICO] Contrato inconsistente: `dica_perfil` vs `dicaPerfil`
- **Arquivos:** `packages/contracts/src/quiz.ts:67` (`dica_perfil`, snake_case) vs `packages/contracts/src/redacao.ts:39` e `packages/contracts/src/simulado.ts:24` (`dicaPerfil`, camelCase); prompt do quiz pede `dica_perfil` (`quiz.service.ts:87`), prompt da redação pede `dicaPerfil` (`redacao.service.ts:28`); o mock (`llm-provider.mock.ts`) retorna `dicaPerfil`.
- **Causa raiz:** convenções diferentes entre as duas eras do código; o commit `297a11d` ("restaura campo dica_perfil no prompt para satisfazer o schema do Zod") já foi um sintoma desse problema.
- **Impacto:** hoje cada módulo é internamente consistente, mas a divergência é uma armadilha: qualquer refatoração, troca de mock↔real ou reaproveitamento de prompt entre módulos quebra a validação Zod novamente (bug recorrente).

### E5. [ALTO] Dois caminhos paralelos de chamada ao Gemini (resquício das duas eras)
- **Arquivos:** `socratic.service.ts` (`chatDireto` usa `GeminiAdapter` injetado direto; `enviarMensagem` usa o token `LLM_PROVIDER`); `study-trails.service.ts:66` (GeminiAdapter direto); quiz/redação/battle usam `LLM_PROVIDER`.
- **Problema:** o planejamento (doc 06 §1) exige que "nenhuma outra parte do sistema conheça o provedor" — a porta `LLMProvider` é o contrato. As injeções diretas do adapter contornam a validação Zod, o logging e os guardrails do caminho oficial.
- **Impacto:** comportamento divergente entre rotas (é exatamente o que causou E1); dificuldade de trocar provedor, mockar em teste e auditar custo.
- **Agravante:** comentário enganoso em `ai.module.ts:39` afirma "LLM_PROVIDER segue sendo o mock por padrão", mas o módulo configura `useClass: GeminiAdapter` — documentação interna mentindo para o próximo dev.

### E6. [ALTO] Tratamento de erro silencioso/frágil nos fluxos de IA
- **`apps/api/src/modules/redacao/redacao.service.ts:110-114`:** `catch { atualizarStatus('falha') }` — genérico, **sem log**. Redações que falham em produção são indiagnosticáveis (timeout? 429? schema inválido? impossível saber).
- **`apps/api/src/modules/study-trails/study-trails.service.ts:65-87`:** fallback para trilha mockada decidido por **string-match** na mensagem de erro (`includes('GEMINI_API_KEY não configurado')`). Erros de rede/timeout/429 estouram sem tratamento; mudar o texto da mensagem quebra o fallback.
- **Contexto:** o `CLAUDE_HANDOFF.md` já pedia "parar de silenciar erros com mockups estáticos" — parcialmente resolvido no quiz, mas o padrão persiste nesses dois pontos.

## 1.2 Motor TRI / Quiz adaptativo / Gamificação

### E7. [CRÍTICO] `submitAnswer` sem transação — estado parcial e XP/streak duplicável
- **Arquivo:** `apps/api/src/modules/quiz/quiz.service.ts:174-254`
- **Problema:** o fluxo de responder uma questão executa em sequência, **sem transação**: `recordAnswer` (tentativa) → `setHabilidade` (theta + theta_evento) → `grantXp` (xp_ledger) → `registrarAtividadeValida` (streak) → atualização do perfil 4D → `classificarErro`. Além disso, a checagem de duplicidade (`UNIQUE(idempotency_key)`) protege apenas a tentativa: entre o retorno de `duplicate=false` e o `grantXp`, um segundo request concorrente com a mesma chave pode conceder XP/streak em dobro.
- **Causa raiz:** repositórios independentes por módulo (bom desenho) sem uma unidade de trabalho transacional englobando o caso de uso.
- **Impacto:** (a) falha no meio do fluxo deixa estado inconsistente — ex.: theta atualizado sem XP, tentativa sem theta_evento; (b) duplicação de XP/streak sob concorrência (retry de rede, double-click) corrompe ranking e gamificação — e o `XPLedger` é append-only, então o dano fica gravado.

### E8. [ALTO] Itens gerados por IA entram no motor TRI com parâmetros chutados
- **Arquivo:** `apps/api/src/modules/quiz/quiz.service.ts:131-146`
- **Problema:** quando o pool de itens esgota, o serviço gera questão via Gemini e a insere no banco com parâmetros TRI **fixos/chutados** (`paramA: 1.2`, `paramB` mapeado da "dificuldade" declarada pela IA, `paramC: 0.2`). O item é corretamente marcado `naoCalibrado: true`, mas **nada consome essa flag**: `updateAbility` usa a/b/c normalmente.
- **Causa raiz:** o marcador de calibração previsto no planejamento (§1.2 — "parâmetros nunca chutados") foi implementado no schema, mas a regra de negócio que o respeitaria não existe.
- **Impacto:** cada resposta a item de IA atualiza o theta do aluno com base em parâmetros fictícios — o erro **acumula** e degrada a estimativa de habilidade (e a previsão de nota) progressivamente, de forma silenciosa.

### E9. [ALTO] Dados perdidos na persistência: `competencia` e `temas_erro` nunca gravados
- **`ocorrencia_erro.competencia`:** coluna existe (`packages/db/src/schema/erro.ts:16`), mas o repositório (`packages/db/src/repositories/error-detector.repository.ts`) nunca a popula — o service (`error-detector.service.ts`) recebe apenas `ItemParams` (a/b/c), que não carrega a competência.
- **`tentativa_resposta.temas_erro`:** o quiz service **passa** `temasErro: [item.competencia]` no erro (`quiz.service.ts:205`), mas o `recordAnswer` do repositório Drizzle (`packages/db/src/repositories/quiz.repository.ts`) **não inclui o campo no INSERT** — o valor é descartado.
- **Impacto:** todo o histórico de erros está sendo gravado **sem classificação temática**. Relatórios por competência, estudo dirigido por lacuna e o refinamento futuro do Detector de Padrão de Erro ficam sem dados — e dados perdidos não são recuperáveis retroativamente (mitigação parcial via join `itemId → banco_de_itens.competencia`).

### E10. [ALTO] Contrato do `ErrorDetector` divergente da implementação
- **Arquivos:** `packages/contracts/src/engines.ts` (interface declara `classify({ tempoMs, historicoRecente, item, acerto })`) vs `packages/engines/error-detector/src/classify.ts:37` (implementação recebe e usa apenas `tempoMs` e `historicoRecente`).
- **Impacto:** o service passa `item` e `acerto` acreditando que influenciam a classificação — são ignorados. Funciona hoje por coincidência; qualquer evolução que confie no contrato (ex.: "erro em item difícil tende a lacuna") falhará silenciosamente.

### E11. [ALTO] `syncCachePerfil`: UPDATE sem UPSERT + falha engolida
- **Arquivo:** `packages/db/src/repositories/gamificacao.repository.ts:151-173`
- **Problema:** o cache de XP/nível/ofensiva em `perfil_cognitivo_4d` é atualizado com `UPDATE` puro dentro de um `try/catch` que apenas loga. Usuário novo sem linha em `perfil_cognitivo_4d` → 0 linhas afetadas, sem erro, sem retry.
- **Impacto:** dashboard/ranking exibem XP e ofensiva desatualizados exatamente para os usuários novos (pior primeiro contato possível com a gamificação). Relaciona-se com o item do `CLAUDE_HANDOFF.md` sobre reatividade do Mapa Cognitivo.

## 1.3 Frontend / Infraestrutura

### E12. [ALTO] CORS duplicado e divergente entre os dois entry points da API
- **Arquivos:** `apps/api/src/main.ts:20-29` (whitelist fixa: `notaa.com.br`, `www`, `localhost:3000`) vs `apps/api/api/index.ts:15-41` (callback com regex que também aceita `*.vercel.app`)
- **Causa raiz:** dois bootstraps (Node local vs function serverless da Vercel) configurados em momentos diferentes da migração.
- **Impacto:** comportamento diferente por ambiente — previews funcionam na Vercel e falham localmente (ou vice-versa); toda mudança de CORS precisa ser lembrada em dois lugares (já divergiram uma vez, vão divergir de novo).

### E13. [MÉDIO] Código morto e resquícios da migração
- **Protótipos monolíticos:** `apps/web/app/components/NotaA_Beta_App.tsx`, `NotaA_Beta_Auth.tsx`, `NotaA_Estudante.tsx`, `NotaA_Estudo.tsx`, `NotaA_Onboarding.tsx`, `NotaA_Quiz_Batalha.tsx` — importados apenas pelas páginas `/preview/*`. Exceção: `NotaA_Dashboard_Batalha.tsx` ainda é usado por `dashboard/page.tsx` como fallback quando a API falha, **duplicando a lógica da própria página** (duas fontes de verdade para a mesma tela).
- **Rotas `/preview/*`:** públicas (fora do layout autenticado `(estudante)`), servem UI mockada em produção.
- **Raiz do repo:** `fix.js` (script que faz regex-replace in-place em arquivos TS — perigoso se executado por engano), `README.mdgit` (arquivo corrompido UTF-16), `tmp/`, `1.png`, `2.png`.
- **Impacto:** confusão sobre qual código é "real", peso no bundle/build, risco de alguém editar o protótipo achando que é a página.

### E14. [MÉDIO] `ErrorSuppressor` suprime erros sem registrá-los
- **Arquivo:** `apps/web/app/components/ErrorSuppressor.tsx:15-29`
- **Problema:** suprime `unhandledrejection` globais cuja mensagem case com padrões de extensões de navegador (intenção legítima), mas por **substring** e **sem logar** o que foi suprimido.
- **Impacto:** um erro real da aplicação que contenha um dos padrões é engolido sem rastro; debugging em produção fica mais difícil.

---

# PARTE 2 — Riscos futuros (ainda não quebrou, mas vai quebrar ou não escala)

### R1. ✅ [CRÍTICO] Chamadas ao Gemini sem timeout, retry ou tratamento de 429
- **Arquivo:** `apps/api/src/modules/ai/gemini.adapter.ts:27-119`
- **Risco:** nenhum `AbortSignal`/timeout, nenhum backoff, nenhum tratamento específico de rate limit do Google (429). Sob uso real: funções serverless penduradas até o timeout da Vercel (custo + UX), falhas em cascata quando a quota estourar, e o modo degradado previsto no doc 06 §2.4/§3.3 (dicas estáticas para a Socrática, fila com retry para a Redação) **não existe**.
- **Quando quebra:** no primeiro pico de uso simultâneo ou no primeiro dia em que a quota do Gemini esgotar.

### R2. [ALTO] Rate limiter em memória — inócuo em serverless, e sem vínculo com planos
- **Arquivo:** `apps/api/src/modules/ai/rate-limiter/rate-limiter.interceptor.ts` (`Map` local)
- **Risco:** na Vercel cada instância tem seu próprio `Map` zerado a cada cold start — o "portão único" do planejamento (doc 06 §6) efetivamente não limita nada. A tabela `contador_rate_limit` e os `limites_ia` por plano (Free/Plus/Escola) previstos no modelo de dados não estão implementados.
- **Impacto ao crescer:** custo de IA sem teto por usuário; o modelo comercial (limites por plano) não é aplicável tecnicamente.

### R3. [ALTO] LGPD/ECA: consentimento de neurodivergência sem validação de quem consentiu
- **Arquivos:** `apps/web/app/onboarding/page.tsx:59-62` (coleta dislexia/TDAH/TEA + checkbox de consentimento) → backend grava em `dado_sensivel_estudante`
- **O que está certo hoje:** o dado está isolado na tabela dedicada, fora do `GET /me` e explicitamente excluído do contexto de IA (`student-context.service.ts`).
- **O risco:** o backend aceita o consentimento sem validar **quem** consentiu. O doc 10 §3 (decisão Q-07) exige consentimento do **responsável** para <18 (com co-consentimento ≥16); os campos `consentimento_base_legal`/`consentido_por` existem no schema mas o fluxo não os popula/verifica. Não há coleta de data de nascimento que permita sequer distinguir menores.
- **Quando quebra:** no primeiro questionamento LGPD/ECA ou auditoria de escola parceira — passivo legal envolvendo dado sensível de menores.

### R4. [ALTO] Dev auth bypass presente no código de produção
- **Arquivos:** `apps/api/src/common/dev-user.ts:14-27`, `apps/api/src/common/guards/auth.guard.ts:33-41`
- **Risco:** com `ENABLE_DEV_AUTH_BYPASS=true` e `NODE_ENV !== 'production'`, o header `x-development-mode: true` pula a autenticação inteira. O default é fail-closed (bom), mas ambientes de staging/preview frequentemente rodam com `NODE_ENV` indefinido ou `development` — uma env var esquecida abre a API inteira.
- **Quando quebra:** no primeiro preview deployment com a flag herdada do ambiente de dev.

### R5. [MÉDIO] `ROUTE_ROLES` declarativa não vinculada aos controllers
- **Arquivo:** `apps/api/src/modules/auth/rbac.ts:34-43`
- **Risco:** a tabela lança erro para rota não mapeada (fail-closed ✅), mas nada garante em build/CI que toda rota nova de controller entre na tabela com os papéis corretos — a proteção depende de disciplina manual. Com o crescimento dos portais (Escola, Admin, Pais), a chance de uma rota com papéis errados cresce.

### R6. [MÉDIO] Mocks em memória divergem dos repositórios Drizzle
- **Arquivos:** `apps/api/src/modules/quiz/quiz.repository.memory.ts:83-111` (não armazena `temasErro`), `error-detector.repository.memory.ts` (sem métodos de leitura)
- **Risco:** os testes e2e rodam contra mocks que se comportam diferente da produção — foi exatamente assim que E9 (dados perdidos) passou despercebido. Bugs de persistência continuarão invisíveis para a suíte.

### R7. [MÉDIO] Observabilidade ausente nos pontos que mais vão falhar
- `SENTRY_DSN` previsto em `.env.example` mas nunca usado; `LogUsoIA` (tokens/custo/latência por chamada de IA — doc 10 §5) não implementado; os catches silenciosos de E6 agravam.
- **Risco:** quando IA/banco falharem sob carga, não haverá dado para diagnosticar nem para auditar custo por usuário/plano.

### R8. [BAIXO] Débitos declarados e aceitáveis (registrar para não virarem surpresa)
- `packages/prompts` é stub (`PROMPTS_STUB = true`) — prompts hardcoded nos services, sem versionamento/rollback nem `prompt_versao_id` em log (doc 06 §5).
- Notificação do protocolo de cuidado (responsável/escola) marcada `pendente` com TODO (`risk-detector.service.ts:80`) — a ocorrência é gravada, mas ninguém é avisado.
- Profiler 4D com sinal em apenas 1 dos 4 eixos (Reflexivo/Impulsivo) e confiança com teto 0.7 — intencional na Fase 1, mas o dashboard exibe 4 eixos.
- Seeds TRI ilustrativos (marcados `naoCalibrado` ✅).

### R9. [MÉDIO] Sentry configurado apenas na API
- **Arquivo:** `apps/api/src/common/sentry.ts`
- **Risco:** `apps/web` (Next.js) não tem captura de erros de frontend configurada — erros de UI/React ficam invisíveis na observabilidade.
- **Pendente:** adicionar `@sentry/nextjs` com `NEXT_PUBLIC_SENTRY_DSN`.

### O que está OK (verificado e vale registrar)
- **Nenhum repositório em memória ativo em produção** — todos os módulos usam Drizzle (simulado usa `DB_CLIENT` direto); a hipótese de perda de dados por cold start foi verificada e descartada.
- **Motor TRI sólido:** 3PL com Newton sobre log-verossimilhança, theta clamped [-4,4], seleção por informação de Fisher, testes coerentes.
- **Isolamento de contexto de IA por usuário (I9):** `estudanteId` sempre do JWT (`req.user.sub`), nunca do body/params; checagem de propriedade nos repositórios (quiz, socrático, redação, dashboard) — **sem IDOR** nos fluxos verificados.
- **Dado sensível isolado:** `dado_sensivel_estudante` fora do `/me` e explicitamente excluído do contexto enviado à IA.
- **Triagem determinística de risco (I6) antes do provedor** nos dois fluxos (socrático e redação), com gravação de `ocorrencia_risco`.
- **Schema bem modelado:** `UNIQUE(idempotency_key)`, CHECK constraints, FKs `ON DELETE RESTRICT`, tabelas append-only (`xp_ledger`, `theta_evento`, `perfil_cognitivo_evento`), migrações versionadas em `supabase/migrations/`.
- **Contratos Zod compartilhados** entre front e back (`packages/contracts`) e API client único com Bearer token (`apps/web/lib/api-client.ts`).
- **Segregação de env vars correta:** `NEXT_PUBLIC_*` só com valores públicos; service role e JWT secret apenas no servidor.

---

# PARTE 3 — Plano de resolução

## Lista única priorizada

| # | Sev. | Item | Arquivos principais |
|---|------|------|---------------------|
| 1 | Crítico | Credenciais commitadas (E2) | `apps/api/test-sni.ts`, `test-sni.js`, `test-db.js`, `packages/db/test-db.js` |
| 2 | Crítico | Rotas `@Public()` de IA (E3) | `apps/api/src/modules/ai/ai.controller.ts` |
| 3 | Crítico | Guardrail I3 ausente no `chatDireto` (E1) | `apps/api/src/modules/socratic/socratic.service.ts` |
| 4 | Crítico | `submitAnswer` sem transação (E7) | `apps/api/src/modules/quiz/quiz.service.ts`, repositórios em `packages/db` |
| 5 | Crítico | Gemini sem timeout/retry/429 + modo degradado (R1) | `apps/api/src/modules/ai/gemini.adapter.ts` |
| 6 | Crítico | Contrato `dica_perfil` vs `dicaPerfil` (E4) | `packages/contracts/src/{quiz,redacao,simulado}.ts`, services e mock |
| 7 | Alto | Rate limiter persistente por plano (R2) | `rate-limiter.interceptor.ts`, nova tabela `contador_rate_limit` |
| 8 | Alto | Itens IA com TRI chutado alimentando theta (E8) | `quiz.service.ts`, `packages/engines/tri` |
| 9 | Alto | `competencia`/`temas_erro` não persistidos (E9) | `packages/db/src/repositories/{error-detector,quiz}.repository.ts` |
| 10 | Alto | `syncCachePerfil` sem UPSERT (E11) | `packages/db/src/repositories/gamificacao.repository.ts` |
| 11 | Alto | Consentimento parental LGPD/ECA (R3) | onboarding (web + api), `dado_sensivel_estudante` |
| 12 | Alto | Dev auth bypass (R4) | `apps/api/src/common/dev-user.ts`, `auth.guard.ts` |
| 13 | Alto | CORS divergente (E12) | `apps/api/src/main.ts`, `apps/api/api/index.ts` |
| 14 | Alto | Contrato `ErrorDetector` divergente (E10) | `packages/contracts/src/engines.ts`, `packages/engines/error-detector` |
| 15 | Médio | Unificar caminho de IA no `LLM_PROVIDER` (E5) | `socratic.service.ts`, `study-trails.service.ts`, `ai.module.ts` |
| 16 | Médio | Logging nos catches silenciosos (E6, R7) | `redacao.service.ts`, `study-trails.service.ts` |
| 17 | Médio | Código morto e resquícios (E13) | `NotaA_*.tsx`, `/preview/*`, `fix.js`, `README.mdgit`, `tmp/` |
| 18 | Médio | Mocks memory alinhados aos Drizzle (R6) | `*.repository.memory.ts` |
| 19 | Médio | `ROUTE_ROLES` vinculada a decorators/CI (R5) | `rbac.ts`, guards |
| 20 | Médio | Sentry + `LogUsoIA` (R7) | api (global), adapter de IA |
| 21 | Médio | `ErrorSuppressor` com log (E14) | `apps/web/app/components/ErrorSuppressor.tsx` |
| 22 | Baixo | Prompts versionados em `packages/prompts` (R8) | `packages/prompts`, services de IA |
| 23 | Baixo | Notificador do protocolo de cuidado (R8) | `risk-detector.service.ts` |
| 24 | Baixo | Comentário enganoso `ai.module.ts:39` (E5) | `ai.module.ts` |
| 25 | Baixo | Dashboard: exibir só eixos 4D com sinal (R8) | web (perfil/mapa cognitivo) |

## Fases de correção (ordem que não quebra o resto)

### Fase 0 — Emergencial: segredos e exposição (sem tocar em lógica de negócio)
*Pode ser feita hoje, risco zero de regressão funcional.*
1. **Rotacionar a senha do Postgres/Supabase** (a atual está vazada no histórico do git) e, por precaução, a `GEMINI_API_KEY`.
2. **Deletar** `apps/api/test-sni.ts`, `test-sni.js`, `test-db.js`, `packages/db/test-db.js`, `fix.js`, `README.mdgit`, `tmp/` e adicionar padrões ao `.gitignore`. Avaliar limpeza do histórico (`git filter-repo`) — com a senha rotacionada, a limpeza vira opcional.
3. **Proteger as rotas `/ai/*`**: remover `@Public()` (restringir a admin) ou deletar as rotas de diagnóstico; no mínimo, parar de aceitar chamadas anônimas que executam `generateContent`.

### Fase 1 — Corretude crítica de comportamento
*Cada item é independente; nenhum altera contrato público consumido pelo frontend.*
4. **Guardrail I3 no `chatDireto`** (`socratic.service.ts`): aplicar `contemRespostaDireta()` + fallback guiado e validação de schema na saída — ou (melhor, alinhado ao item 15) aposentar a rota stateless e apontar o frontend do tutor para o fluxo persistido, que já tem tudo. Adicionar os testes de guardrail do doc 06 §2.3 (I3, G-S1) cobrindo **ambas** as rotas enquanto coexistirem.
5. **Transação no `submitAnswer`**: envolver tentativa + theta + XP + streak + perfil numa `db.transaction` (exige propagar o handle `trx` pelos repositórios ou criar um método de caso de uso no nível do `packages/db`); tratar conflito de `idempotency_key` **dentro** da transação para eliminar a janela de XP duplicado.
6. **Resiliência no `gemini.adapter`**: timeout via `AbortSignal` (~15s), retry com backoff exponencial para erros transitórios/429 (máx. 2 tentativas), e implementação do modo degradado do doc 06 (Socrática → dica estática; Redação → manter status pendente para retry, em vez de `falha` terminal).
7. **Unificar o contrato do feedback**: padronizar `dicaPerfil` (camelCase, como o resto dos contratos) em `quiz.ts`, prompt do quiz e mock — mudança coordenada em contracts + api + web num único PR.

### Fase 2 — Robustez e conformidade
8. **Rate limiter persistente**: tabela `contador_rate_limit` (janela por usuário) consultada no interceptor, com limites lidos do plano (`limites_ia`) — destrava também o modelo comercial Free/Plus/Escola.
9. **Persistir `competencia` e `temas_erro`**: incluir os campos nos INSERTs dos repositórios Drizzle; mudar a assinatura de `classificarErro` para receber o registro completo do item (com competência).
10. **`syncCachePerfil` com UPSERT** (`onConflictDoUpdate` em `estudanteId`) e log de aviso quando o perfil não existir.
11. **Respeitar `naoCalibrado`**: excluir itens não calibrados do `updateAbility` (registrar a tentativa sem atualizar theta) **ou** aplicar parâmetros neutros (a=1, b=0, c=0.2) — decisão pedagógica a validar; o importante é a flag deixar de ser decorativa.
12. **Unificar CORS**: extrair a lista/regra de origens para um módulo único importado pelos dois entry points.
13. **Consentimento parental (LGPD/ECA)**: coletar data de nascimento no cadastro; para <18, exigir fluxo de consentimento do responsável antes de gravar `dado_sensivel_estudante`, populando `consentido_por`/`consentimento_base_legal`; bloquear o passo 7 do onboarding sem isso.
14. **Endurecer o dev bypass**: além de `NODE_ENV !== 'production'`, exigir allowlist explícita (ex.: só quando `VERCEL_ENV === undefined`/local) — ou remover o mecanismo e usar tokens de teste reais do Supabase.
15. **Alinhar contrato do `ErrorDetector`**: remover `item`/`acerto` da interface (ou passar a usá-los no motor) — decidir e sincronizar contrato, motor e service.

### Fase 3 — Débito técnico e higiene
16. **Consolidar toda chamada de IA no token `LLM_PROVIDER`** (socratic direto e study-trails); corrigir o comentário de `ai.module.ts`.
17. **Logging estruturado** nos catches de redação/trilhas (erro + contexto + correlation id) e no `ErrorSuppressor` (logar o que foi suprimido).
18. **Remover código morto**: protótipos `NotaA_*` não usados, rotas `/preview/*` (ou protegê-las por env), fallback duplicado do dashboard (`NotaA_Dashboard_Batalha`) substituído por estado de erro simples.
19. **Alinhar mocks memory aos repositórios Drizzle** (mesmos campos persistidos) para os testes voltarem a ter valor preditivo.
20. **Guard-rail de RBAC em CI**: teste que enumera as rotas registradas no Nest e falha se alguma não estiver em `ROUTE_ROLES`.
21. **Observabilidade**: ativar Sentry (DSN já previsto) e implementar `log_uso_ia` (tokens/custo/latência/versão de prompt por chamada).
22. **Prompts versionados**: mover os prompts hardcoded para `packages/prompts` com versão e logar `prompt_versao_id`.
23. **Notificador do protocolo de cuidado**: implementar o escalonamento (responsável/escola quando houver vínculo) conforme decisão Q-01 do doc 10 §6.

## Critérios de verificação por fase
- **Fase 0:** senha antiga não conecta mais; `git ls-files` sem arquivos de segredo; `curl` anônimo em `/ai/test|ping|models` retorna 401/404.
- **Fase 1:** testes de guardrail I3/G-S1 verdes nas duas rotas; teste de concorrência (2 requests, mesma idempotency key) concede XP uma única vez; kill do provedor no meio da correção de redação deixa status recuperável; `pnpm build` + suíte verdes.
- **Fase 2:** rate limit sobrevive a cold start (2 instâncias); nova tentativa grava `temas_erro`; usuário novo vê XP no dashboard imediatamente; onboarding de <18 exige consentimento do responsável.
- **Fase 3:** nenhuma injeção direta de `GeminiAdapter` fora do módulo `ai`; CI falha para rota fora de `ROUTE_ROLES`; bundle do web sem componentes `NotaA_Beta_*`.

## Monitorar (sem ação imediata)

- **[BAIXO, monitorar] `simulado_questao.item_id` é FK para `banco_de_itens`.** Hoje é seguro porque `banco_de_itens` tem RLS ligada e **nenhuma** policy (leitura só por service role), então a policy `p_simulado_questao_own` deixa o `item_id` visível ao dono da sessão, mas o join do lado do cliente não resolve nada. Se essa política de `banco_de_itens` mudar no futuro — qualquer policy pública de leitura —, reavaliar se `simulado_questao` também precisa mascarar `item_id` ou passar a ser servida só via API. Ver `supabase/policies/0003_rls_tabelas_novas.sql`.
