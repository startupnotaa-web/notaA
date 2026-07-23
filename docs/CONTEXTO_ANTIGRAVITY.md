# Contexto Atual da Plataforma Nota A (Antigravity)

> **Data:** 2026-07-22
> **Objetivo:** Mapeamento de contexto baseado na arquitetura documentada e na validação do estado real do código, após as fases de resolução (0, 1, 2 e 3).

## 1. Itens do Plano de Resolução Implementados

A varredura no código atual confirmou que a grande maioria dos itens apontados na `AUDITORIA_GERAL.md` foram corrigidos e implementados com sucesso:

### Fase 0 — Emergencial
- **E2 (Credenciais Commitadas):** Os arquivos de script ad-hoc (`test-sni.ts`, `test-db.js`, etc.) bem como arquivos de lixo (`fix.js`, `tmp/`) foram deletados do repositório.
- **E3 (Rotas Públicas de IA):** O `ai.controller.ts` teve a flag `@Public()` removida e agora é restrito com `@Roles('admin')`, fechando o vazamento de uso não autenticado.

### Fase 1 — Corretude Crítica
- **E1 (Guardrail I3 Socrática):** O método `chatDireto` em `socratic.service.ts` foi atualizado para validar `contemRespostaDireta` e aplicar o `fallbackGuiado` caso o LLM entregue a resposta.
- **E7 (Transação no Quiz):** O `submitAnswer` do `quiz.service.ts` passou a usar uma Unidade de Trabalho transacional (`uow.run`), atomicamente persistindo tentativa, theta, XP e streak (fechando a brecha de concorrência e XP duplo).
- **R1 (Resiliência do Gemini):** O `gemini.adapter.ts` agora inclui retries com backoff exponencial para erros transitórios (429, 5xx, timeouts) e o limite de tempo explícito `GEMINI_TIMEOUT_MS`.
- **E4 (Contrato dicaPerfil):** A inconsistência de `dica_perfil` vs `dicaPerfil` foi resolvida, restando apenas `dicaPerfil` nos contratos (`packages/contracts/src/quiz.ts` etc).

### Fase 2 — Robustez
- **R2 (Rate Limiter):** O `rate-limiter.interceptor.ts` agora utiliza o banco de dados (`contador_rate_limit`) em conjunto com os limites de IA atrelados ao `plano` do usuário, sendo resiliente e funcional em serverless.
- **E9 (Perda de Dados de Erro):** `competencia` e `temas_erro` agora são adequadamente salvos nas chamadas Drizzle de `error-detector.repository.ts` e `quiz.repository.ts`.
- **E11 (Sync Cache Perfil):** Foi migrado para UPSERT (`onConflictDoUpdate`) em `gamificacao.repository.ts`, prevenindo perda de atualização visual de perfil para novos usuários.
- **E8 (TRI Chutado da IA):** O código no `submitAnswer` intercepta itens com flag `naoCalibrado: true` e não atualiza o estimador (`theta`) com eles, evitando degradação da nota estimada do aluno.
- **E12 (CORS):** Centralizado corretamente em `src/common/cors.ts` (consumido tanto em `main.ts` quanto em `api/index.ts`).
- **R3 (Consentimento Parental):** O front end (`onboarding/page.tsx`) bloqueia com sucesso a gravação de neurodivergência e captura dados de LGPD caso o estudante seja menor de 18 anos, apresentando alerta amigável.
- **R4 (Dev Auth Bypass):** Endurecido em `dev-user.ts` onde a flag só aceita bypass local (`!process.env.VERCEL`).
- **E10 (Error Detector):** Interface atualizada (sem parâmetros inúteis de item) usando apenas `tempoMs` e histórico.

### Fase 3 — Débito e Higiene
- **E5 (Consolidar LLM_PROVIDER):** Todos os motores (incluindo Study Trails e Socrática) agora utilizam injeção via `LLM_PROVIDER`, passando pelo gateway oficial da aplicação, permitindo mocking ou logging padronizado. O comentário enganoso em `ai.module.ts` foi removido.
- **E6 (Catches Silenciosos):** O serviço de redação agora emite um log estruturado (`this.logger.error`) antes de retornar a marcação de 'falha' sem perder o status de submissão do aluno.
- **E13 (Código Morto):** Limpeza dos componentes `NotaA_*` e da pasta `/preview` foi executada.
- **R6 (Mocks Memory):** O mock de teste do repositório do quiz alinhou-se com a adição de `temasErro`.
- **R5 (RBAC test):** Os testes de sincronia de papéis (`route-roles-sync.test.ts`) foram introduzidos e existem fisicamente na suíte CI.
- **R7 (Observabilidade):** O Sentry foi devidamente inicializado e as requisições LLM registram seus metadados utilizando o `LlmUsageLoggerProvider`.
- **R8 (Prompts Versionados):** Todos os endpoints integram e apontam para a estrutura de export de prompts com `.versao`.

---

## 2. Pendente ou Parcialmente Implementado

O mapeamento revelou que a auditoria está fundamentalmente correta em assumir que quase todo o backlog foi fechado, com apenas uma discrepância/dívida que ainda resta das metas estabelecidas na Fase 3:

*   **[Parcialmente Feito] E14 (ErrorSuppressor com log):** O arquivo `apps/web/app/components/ErrorSuppressor.tsx` foi criado e consegue impedir a propagação default de erros de extensões (`event.preventDefault()`). **No entanto**, ele descumpriu a diretiva de "logar o que foi suprimido", permanecendo inteiramente silencioso no console. Isso pode atrapalhar debugging futuro em caso de supressão agressiva acidental.
*   **[Pendente de Calibração/Decisão] Q-05/Q-02:** A parametrização dos perfis 4D e os valores neutros de calibração para TRI continuam rodando via heuristics ajustáveis, mas em algum momento isso precisará ser balanceado.

---

## 3. Estado Atual dos Módulos Principais

1.  **Auth & Onboarding:**
    *   Fluxo robusto (Node Backend + JWT Supabase) com dev fallback seguro (apenas em ambiente local). O Frontend React salva estado incremental de onboarding via `PUT` passo a passo. Conformidade legal (ECA/LGPD) sólida no passo 7 (idade < 18).
2.  **Motor TRI / Quiz Adaptativo:**
    *   Opera com isolamento impecável das lógicas do provedor de IA.
    *   Toda tentativa de resposta transaciona de forma atômica no Drizzle, garantindo sincronia entre ganho de experiência, recálculo de Thetas, e progressão em streak (eliminando exploit de respostas paralelas).
    *   Questões criadas pela IA generativa possuem flag `naoCalibrado`, impedindo corrupção no estimador TRI.
3.  **IA Socrática:**
    *   Trabalha com montagem de contexto dinâmica via `ContextBuilderService`.
    *   Integra tanto um validador de periculosidade de prompt (Triagem de Risco Determinística prévia), quanto um guardrail post-LLM (I3) impedindo a resposta final direta ao aluno, forçando fallback estático e guiado caso o Gemini "escorregue".
4.  **Corretor de Redação:**
    *   Avaliação baseada firmemente no `EssayEvaluationSchema` de 5 competências.
    *   Falhas de chamada LLM deixam a redação no status `falha`, sem deletar o arquivo do aluno, possibilitando retries.
    *   Possui também validação prévia de Sinais de Risco (acionando os protocolos de acompanhamento psicopedagógico).
5.  **Gamificação (XP/Streak):**
    *   Design baseado em persistência atômica e ledger auditável (`xp_ledger` append-only).
    *   Correções com Upsert no Perfil Cognitivo 4D aplicadas, impedindo erros fantasmas de atualização com `UPDATE` falho para usuários zerados recém egressos do onboarding.
6.  **Rate Limiter:**
    *   Não é mais um Mock em Memória. Persiste e valida o contador diário diretamente contra a tabela `contador_rate_limit`, respeitando lógicas de `limites_ia` descritas no Plano/Assinatura da base de dados. Fail-open em caso de desconexão.
7.  **Sentry & Observabilidade:**
    *   Registros nativos do NestJS capturados e reportados pelo Sentry global, acompanhados das telemetrias individualizadas de latência e consumo de tokens por chamadas de Inteligência Artificial usando a porta desacoplada `LlmUsageLoggerProvider`.

---

## 4. Divergências e Intervenções Manuais Identificadas

Durante a varredura e cruzamento dos documentos mestres `NotaA_Planejamento_Criacao_Execucao.md` com a base de código, os seguintes pontos evidenciam uma leve divergência da estrita documentação:

1.  **String-matching the Fallback no StudyTrails:** Embora E6 pedisse a remoção dos mocks que abafavam erros na IA, o arquivo `study-trails.service.ts` ainda mantém um _fallback string-match_ estático engatilhado pela exceção de falta de `GEMINI_API_KEY`, devolvendo Mock Trilhas em vez de alertar e parar. Isso impede o app de crashar localmente, mas é uma exceção manual e explícita à regra purista ditada nos documentos.
2.  **Omissão no ErrorSuppressor:** Como reportado na seção de pendências, o desvio explícito da diretriz de incluir logging no catador de erros globais `ErrorSuppressor.tsx`, preferindo escondê-lo totalmente.

*A base arquitetural encontra-se sólida e pronta para novas features em cima do Antigravity, respeitando a separação entre Domínio Determinístico vs. Geração por LLMs.*
