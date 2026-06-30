# 05 — Contratos de API

> Contratos entre **Apresentação ↔ Orquestração** (REST público da API) e **Orquestração ↔ Motores** (interno, TS). Todos os payloads são validados por **Zod** (`packages/contracts`), compartilhados entre web e api. Derivado dos fluxos do [doc 03](03-arquitetura.md) e das entidades do [doc 04](04-modelo-de-dados.md).

---

## 1. Convenções gerais

- **Base:** `/api/v1`. **AuthN:** `Authorization: Bearer <JWT do Supabase Auth>` em tudo, exceto rotas públicas da landing.
- **Sucesso:** corpo = recurso/coleção direto. **Erro:** envelope único
  ```json
  {
    "error": {
      "code": "RATE_LIMIT_REACHED",
      "message": "Você atingiu o limite de IA do seu plano hoje.",
      "details": {}
    }
  }
  ```
- **Códigos de erro de negócio (exemplos):** `VALIDATION_ERROR` (422), `UNAUTHENTICATED` (401), `FORBIDDEN_ROLE` (403), `RATE_LIMIT_REACHED` (429), `AI_PROVIDER_UNAVAILABLE` (503 → modo degradado), `RISK_PROTOCOL_TRIGGERED` (200, resposta especial).
- **Rate limit de IA:** respostas de IA incluem headers `X-AI-Limit`, `X-AI-Remaining`, `X-AI-Reset`. Limite atingido = `429` **de negócio** (mensagem amigável), nunca erro técnico.
- **Paginação:** `?cursor=&limit=` (cursor sobre uuid v7). **Idempotência:** header `Idempotency-Key` em POSTs de efeito (respostas de quiz).
- **RBAC:** cada rota declara papéis permitidos (Guards). Estudante só acessa o próprio `:meu` recurso.

## 2. Auth e perfil

| Método | Rota                   | Papéis  | Descrição                                                                                                           |
| ------ | ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`       | público | Cria `usuario` (perfil estudante/professor/escola) após signup no Supabase Auth; recusa `responsavel`/`admin` (A2). |
| GET    | `/me`                  | todos   | Dados do usuário logado + papel + plano ativo.                                                                      |
| POST   | `/auth/password-reset` | público | Dispara recuperação (delega ao Supabase Auth).                                                                      |

## 3. Onboarding (E1) — salvamento incremental (A6)

| Método | Rota                   | Descrição                                                                                                            |
| ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/onboarding/state`    | Retorna `{ passoAtual, dados, concluido }`.                                                                          |
| PUT    | `/onboarding/steps/:n` | Salva o passo `n` (1–8) incrementalmente.                                                                            |
| POST   | `/onboarding/complete` | Valida 8 passos → cria `perfil_onboarding.concluido_em` + instancia `perfil_cognitivo_4d` inicial (baixa confiança). |

`PUT /onboarding/steps/7` (neurodivergência — **opcional**) grava em `dado_sensivel_estudante` com consentimento; pode ser pulado.

```json
// PUT /onboarding/steps/2  (objetivo)
{ "objetivoEnem": "medicina", "notaAlvo": 800 }
// 200 → { "passoAtual": 2, "proximoPasso": 3 }
```

## 4. Quiz adaptativo (E2)

| Método | Rota                           | Descrição                                                                     |
| ------ | ------------------------------ | ----------------------------------------------------------------------------- |
| POST   | `/quiz/sessions`               | Inicia `sessao_avaliativa(tipo=quiz)`; retorna `sessaoId` + 1ª questão (TRI). |
| GET    | `/quiz/sessions/:id/next-item` | Próxima questão segundo theta atual.                                          |
| POST   | `/quiz/sessions/:id/answers`   | Submete resposta (idempotente).                                               |
| POST   | `/quiz/sessions/:id/finish`    | Encerra sessão.                                                               |

```json
// Questão entregue ao cliente — SEM gabarito (segurança)
{ "itemId":"...", "area":"matematica", "enunciado":"...", "alternativas":[{"id":"a","texto":"..."}], "numero": 3 }

// POST /answers  (request)
{ "itemId":"...", "respostaId":"b", "tempoRespostaMs": 14200 }
// 200 (response)
{ "acerto": true, "theta": 0.42, "erroPadrao": 0.31, "xpGanho": 15,
  "feedback": { "classificacaoErro": null }, "proximaQuestao": { "itemId":"...", "...":"..." } }
```

## 5. Perfil cognitivo, dashboard, gamificação

| Método | Rota                    | Descrição                                                                           |
| ------ | ----------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/me/cognitive-profile` | 4 eixos + confiança + recomendações (E3). Atualização é server-side; cliente só lê. |
| GET    | `/me/dashboard`         | Estimativa de nota, evolução de θ, streak, marcos, batalhas (E4).                   |
| GET    | `/me/xp?cursor=&limit=` | Extrato do `xp_ledger` (append-only).                                               |
| GET    | `/me/streak`            | `{ diasConsecutivos, ultimaAtividade, freezesDisponiveis }`.                        |
| GET    | `/me/achievements`      | Conquistas desbloqueadas + bloqueadas (catálogo).                                   |

```json
// GET /me/dashboard
{
  "estimativaNota": {
    "geral": 612,
    "porArea": { "matematica": 640, "...": 0 },
    "naoCalibrado": true
  },
  "theta": { "matematica": { "atual": 0.42, "serie": [{ "t": "2026-06-20", "v": 0.1 }] } },
  "streak": { "diasConsecutivos": 5, "freezesDisponiveis": 1 },
  "xpTotal": 1240
}
```

## 6. Redação (E7) — assíncrona

| Método | Rota            | Descrição                                                                     |
| ------ | --------------- | ----------------------------------------------------------------------------- |
| POST   | `/redacoes`     | Cria redação → enfileira correção → `202` com `{ id, status:"em_correcao" }`. |
| GET    | `/redacoes/:id` | Status + resultado quando pronto.                                             |
| GET    | `/me/redacoes`  | Histórico.                                                                    |

**Contrato de saída do Corretor (o central — I4/I5):**

```json
{
  "redacaoId": "uuid",
  "status": "corrigida",
  "rubricaVersao": "rubrica_v1",
  "motorVersao": "corretor-2026.06",
  "modeloVersao": "llmprovider:modelo@versao",
  "notaTotal": 760,
  "competencias": [
    {
      "competencia": 1,
      "titulo": "Domínio da norma culta",
      "nota": 160,
      "justificativa": "Texto coeso, com poucos desvios...",
      "citacoes": [
        {
          "trecho": "houveram muitos casos",
          "inicio": 412,
          "fim": 432,
          "comentario": "Concordância: 'houve' é impessoal."
        }
      ]
    }
    /* competências 2..5 — sempre as 5, separadas */
  ],
  "feedbackGeral": {
    "pontosFortes": ["Tese clara na introdução"],
    "pontosMelhoria": ["Aprofundar repertório na C2"],
    "proximoPasso": "Praticar conectivos (C4)"
  },
  "criadoEm": "2026-06-28T12:00:00Z"
}
```

- **Notas por competência** em níveis (rubrica): `{0,40,80,120,160,200}` em `rubrica_v1` (**calibrável** — Q-03, marcada `nao_calibrado`).
- **`citacoes`** sempre referenciam trechos **do próprio texto** (com offsets), nunca feedback genérico.
- Provedor fora/limite → `status:"em_correcao"` permanece (fila/retry), cliente faz polling/recebe push.

## 7. IA Socrática (E8)

| Método | Rota                              | Descrição                                                        |
| ------ | --------------------------------- | ---------------------------------------------------------------- |
| POST   | `/socratic/sessions`              | Abre/recupera conversa; aceita `temaAtivo`/`itemId` de contexto. |
| POST   | `/socratic/sessions/:id/messages` | Envia mensagem; recebe **pergunta-guia** (nunca a resposta).     |
| GET    | `/socratic/sessions/:id/messages` | Histórico da sessão (isolado por usuário — I9).                  |

**Resposta é união discriminada por `tipo`:**

```json
// guidance (caso normal — I3)
{ "tipo":"guidance", "mensagem":"O que acontece com a equação se você isolar x primeiro?",
  "estado":"GerarPerguntaGuia", "passo": 2 }

// redirect_support (insistência repetida na resposta direta)
{ "tipo":"redirect_support", "mensagem":"Vamos voltar um passo mais simples juntos:" }

// degraded_static (limite/provedor fora — I12)
{ "tipo":"degraded_static", "mensagem":"A tutora está indisponível agora.",
  "dicasEstaticas":["Releia o enunciado e sublinhe o que é pedido."] }

// care_protocol (sinais de risco — I6; decidido pelo Domínio, não pela IA)
{ "tipo":"care_protocol", "mensagem":"Percebi algo importante na sua mensagem. Você não está sozinho(a).",
  "recursos":[{ "nome":"CVV", "contato":"188", "url":"https://cvv.org.br" }],
  "escalonamento":"responsavel_escola" }
```

## 8. Portal da Escola e Painel Admin (MVP parcial)

| Método | Rota                            | Papéis            | Descrição                                               |
| ------ | ------------------------------- | ----------------- | ------------------------------------------------------- |
| GET    | `/escola/overview`              | gestor            | KPIs agregados da escola.                               |
| GET    | `/escola/turmas/:id/desempenho` | gestor, professor | Desempenho agregado (sem expor dado sensível — I10).    |
| GET    | `/admin/users`                  | admin             | Gestão de usuários (toda ação → `log_auditoria_admin`). |
| GET    | `/admin/ai-usage`               | admin             | Monitoramento de `log_uso_ia` (custo/volume).           |

## 9. Contratos internos Orquestração ↔ Motores (TS, não-HTTP)

Interfaces puras em `packages/contracts` (implementadas em `packages/engines`); a API as injeta. **Nenhuma conhece HTTP, DB ou IA.**

```ts
interface MotorTRI {
  selectNextItem(in: { theta: number; area: Area; expostos: string[]; pool: ItemParams[] }): { itemId: string };
  updateAbility(in: { theta: number; item: ItemParams; acerto: boolean; tempoMs: number }): { theta: number; erroPadrao: number };
  probabilidadeAcerto(theta: number, item: ItemParams): number; // 3PL
}
interface CognitiveProfiler {
  update(in: { atual: Perfil4D; sinais: SinalComportamental[] }): { perfil: Perfil4D; confianca: number; recomendacoes: Recomendacao[] };
}
interface ErrorDetector {
  classify(in: { tempoMs: number; historicoRecente: Tentativa[]; item: ItemParams; acerto: boolean })
    : { classificacao: 'lacuna_conhecimento' | 'deslize_atencao'; evidencias: object; confianca: number };
}
interface LLMProviderPort {
  complete(in: { sistema: string; contexto: object; schema: ZodSchema }): Promise<{ data: object; uso: UsoTokens }>;
}
```

> Trocar provedor de IA ou banco = trocar **adaptador**; estas assinaturas e os motores **não mudam** (doc 02 §4).
