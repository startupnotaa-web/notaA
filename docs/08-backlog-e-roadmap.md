# 08 — Backlog & Roadmap

> Fiel à seção 2 do [planejamento](../NotaA_Planejamento_Criacao_Execucao.md). Épicos, histórias com critérios de aceite, sequenciamento em fases e introdução faseada da gamificação. Guardrails dos docs 06/07/10 entram como **gates de qualidade** (DoD).

---

## 1. 🎯 Métrica norte (North Star)

> **% de estudantes que completam o onboarding e, na mesma sessão ou na seguinte, respondem a um quiz adaptativo e visualizam uma atualização no Dashboard/Mapa Cognitivo.**

Valida de uma vez Onboarding (E1), Motor TRI (E2), Cognitive Profiler (E3) e Dashboard (E4) — o coração do produto.

**Métricas de apoio:** taxa de conclusão do onboarding · questões respondidas/sessão · retorno em 7 dias · streak médio · custo de IA por usuário ativo (governança).

## 2. Definição de Pronto (DoR) e de Concluído (DoD)

**DoR (para entrar numa sprint):** história com critério de aceite testável · dependências resolvidas · dados de calibração necessários marcados (ou stub `nao_calibrado` aprovado) · impacto de privacidade avaliado (doc 10).

**DoD (para fechar):**

- [ ] Critérios de aceite verdes (teste automatizado onde aplicável).
- [ ] **Guardrails aplicáveis como teste** (I3/I4/I6 etc. — doc 06) passando no CI.
- [ ] **RBAC/RLS** verificados para o recurso (doc 10).
- [ ] **Acessibilidade**: contraste AA + `prefers-reduced-motion`/kill-switch + teclado (doc 07).
- [ ] Sem segredo commitado; logs/auditoria onde exigido.
- [ ] Telemetria da métrica norte instrumentada quando a história a toca.

## 3. Épicos (P0/P1/P2 — espelha 2.2)

| Épico                                  | Objetivo                                    | Depende de             | Prio | Fase |
| -------------------------------------- | ------------------------------------------- | ---------------------- | ---- | ---- |
| **E1** Autenticação e Onboarding       | Cadastrar/logar + perfil em 8 passos        | —                      | P0   | 0    |
| **E2** Motor TRI e Quiz Adaptativo     | Selecionar/pontuar questões adaptativamente | itens calibrados, E1   | P0   | 0→1  |
| **E3** Cognitive Profiler              | Inferir e expor perfil 4D                   | E2                     | P0   | 1    |
| **E4** Dashboard Core                  | Evolução, estimativa de nota, streak        | E2, E3                 | P0   | 1    |
| **E9** Gamificação Core (XP, Streak)   | Recompensar uso e consistência              | E2                     | P0   | 1    |
| **E5** Detector de Padrão de Erro      | Lacuna vs. deslize                          | E2                     | P1   | 2    |
| **E6** Simulado Adaptativo             | Avaliação longa multi-área                  | E2                     | P1   | 2    |
| **E7** Editor de Redação + Corretor IA | Nota/feedback por competência               | E1                     | P1   | 2    |
| **E8** IA Socrática                    | Tutor que guia sem entregar resposta        | E3, E5                 | P1   | 2    |
| **E10** Conquistas e Histórico         | Reconhecer marcos                           | E9                     | P1   | 3    |
| **E11** Portal da Escola (mínimo)      | Turmas e desempenho p/ gestores             | E2–E4                  | P2   | 4    |
| **E12** Painel Admin (mínimo)          | Gestão de usuários + monitoramento          | E1, LogUsoIA           | P2   | 4    |
| **E13** Painel dos Pais                | Progresso simplificado do filho             | E4, VinculoResponsavel | P2   | 4    |
| **E14** Duelo PvP                      | Competição 1v1 (tempo-real)                 | E2, E9                 | P2   | 5    |
| **E15** Batalhas Coletivas             | Engajamento em escala de turma              | E9, E11                | P2   | 5    |

## 4. Histórias com critérios de aceite (P0/P1)

### E1 — Autenticação e Onboarding

- **H1.1** Cadastro com seleção de perfil (Estudante/Professor/Escola).
  - ✓ seleção obrigatória · validação de e-mail · redireciona à área correta · **Responsável/Admin não** se auto-cadastram (A2).
- **H1.2** Onboarding de 8 passos (nome, objetivo, estilo, dificuldades, rotina, autopercepção, neurodivergência _opcional_, confirmação).
  - ✓ cada passo salvo incrementalmente (A6) · passo de neurodivergência claramente **opcional**, gravado em `DadoSensivelEstudante` com consentimento · ao fim cria `PerfilOnboarding.concluido_em` + instancia `PerfilCognitivo4D` inicial (baixa confiança).
- **H1.3** Recuperação de senha segura. ✓ fluxo de reset por e-mail.

### E2 — Motor TRI e Quiz Adaptativo

- **H2.1** Questões com dificuldade adaptativa.
  - ✓ a cada resposta o θ é recalculado · próxima questão selecionada pelo θ atual + parâmetros do item · `TentativaResposta` persistida com tempo · **gabarito nunca enviado ao cliente**.
- **H2.2** Estimativa de nota atualizada na barra superior após responder. ✓ reflete θ mais recente (mapa θ→nota marcado `nao_calibrado`, Q-06).

### E3 — Cognitive Profiler

- **H3.1** Perfil 4D inferido **silenciosamente** do comportamento.
  - ✓ atualizado em background (tempo, navegação, tipo de erro) · cada atualização registra confiança (`perfil_cognitivo_evento`) · recomendações geradas dos 4 eixos · **sem questionário extra repetitivo**.

### E4 — Dashboard Core

- **H4.1** Evolução, estimativa de nota e streak num só lugar.
  - ✓ reflete estado mais recente do TRI e do XP Ledger · streak quebra corretamente sem atividade válida (Q-05), respeitando tolerância/freeze.

### E5 — Detector de Padrão de Erro

- **H5.1** Classificar erro como lacuna vs. deslize. ✓ usa tempo/histórico/mudança de padrão · grava `OcorrenciaErro` com evidências e confiança · alimenta feedback e a Socrática.

### E7 — Editor de Redação + Corretor IA

- **H7.1** Escrever redação e receber nota por competência.
  - ✓ **sempre as 5 competências** exibidas separadas (0–200) · feedback cita **trechos do próprio texto** · resultado em `AvaliacaoRedacao` · assíncrono com estado claro · **modo degradado** (fila/retry) se provedor fora (I12).

### E8 — IA Socrática

- **H8.1** Chat que guia até a resposta, sem entregá-la.
  - ✓ **nunca a resposta direta** antes de ≥1 pergunta-guia (I3) · usa contexto da sessão (perfil 4D, padrão de erro) · **política de redirecionamento** na insistência (não repetir recusa) · **fallback de cuidado** em sinais de risco (I6).

### E9 — Gamificação Core

- **H9.1** Ganhar XP e manter sequência.
  - ✓ XP sempre lançado no `XPLedger` (append-only, I7) · streak por atividade válida diária com regra clara + tolerância (gamificação inclusiva, fonte 4.1) · recompensa também esforço/recuperação de erro (liga ao E5 na Fase 2).

## 5. Roadmap por fases (com critério de saída)

| Fase                           | Foco                               | Épicos         | Critério de saída                                                                                         |
| ------------------------------ | ---------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| **0 — Fundação**               | Identidade, modelagem, base do TRI | E1, base de E2 | Login + onboarding salvando incremental; TRI seleciona/pontua item (rústico) com schema de dados migrado. |
| **1 — Núcleo de Aprendizagem** | Loop core completo                 | E2, E3, E4, E9 | **Métrica norte mensurável**: aluno faz onboarding → quiz adaptativo → vê Dashboard/Mapa atualizar.       |
| **2 — Estudo Aprofundado**     | Maior valor percebido              | E5, E6, E7, E8 | Redação corrigida pelas 5 competências + Socrática com guardrails verdes em CI.                           |
| **3 — Retenção**               | Engajamento médio prazo            | E10, E14*      | Conquistas/certificados/histórico; XP/Streak estáveis. (*Duelo pode escorregar p/ Fase 5.)                |
| **4 — Institucional**          | Gestores, pais, operação           | E11, E12, E13  | Portal Escola (2–3 abas), Admin (2–3 abas), Painel dos Pais com dados reais.                              |
| **5 — Expansão Social**        | Engajamento em escala              | E14, E15       | Duelo PvP (tempo-real) + batalhas coletivas validados.                                                    |

## 6. Introdução faseada da gamificação (espelha 4.3)

| Fase | Mecânicas                                                                  |
| ---- | -------------------------------------------------------------------------- |
| 1    | XP por ação · Streak básico (com tolerância)                               |
| 2    | Reconhecimento por reflexão/recuperação de erro (liga ao Detector de Erro) |
| 3    | Conquistas, certificados, histórico visual                                 |
| 4    | Ranking por turma/escola · Painel dos Pais (não gamificado)                |
| 5    | Duelo PvP · Batalhas coletivas                                             |

> **Princípio inclusivo:** progresso individual antes de comparação social; rankings/duelos **opcionais**; streak nunca pune um único dia de forma desproporcional (fonte 4.1).

## 7. Gates de qualidade transversais (viram histórias técnicas)

- **G-CI-1** Suíte de guardrails de IA (I3/I4/I6, validação de schema, modo degradado) — pré-requisito de release das Fases 2+.
- **G-CI-2** Teste automatizado de acessibilidade (contraste AA, `prefers-reduced-motion`) — axe/Pa11y no CI (doc 07).
- **G-CI-3** Verificação de RBAC/RLS por recurso (doc 10).
- **G-CI-4** Auditoria: toda ação de Admin gera `LogAuditoria` (doc 10).

## 8. Riscos e dependências de calibração (bloqueiam histórias)

| Risco/Dep                                 | Afeta  | Mitigação                                                     |
| ----------------------------------------- | ------ | ------------------------------------------------------------- |
| Q-02 banco de itens + parâmetros TRI 🔧   | E2, E6 | Itens públicos + `nao_calibrado=true`; recalibrar com volume. |
| Q-03 rubrica das 5 competências 🔧        | E7     | `rubrica_v1` versionada, validada por especialista.           |
| Q-06 mapa θ→nota 🔧                       | E2/E4  | Mapeamento provisório marcado não-calibrado.                  |
| Q-01 destinatário do protocolo de cuidado | E8/E7  | Default (CVV/188 + escalonamento) até decisão (doc 10).       |
| Custo de IA                               | E7/E8  | Rate Limiter por plano + modelo econômico na Socrática.       |
