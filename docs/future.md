# future.md — Bugs, inconsistências e melhorias

> Levantamento a partir da leitura do código-fonte (não só dos docs). Cada item traz: **onde está**, **o que deveria fazer**, **o problema** e **correção sugerida**. Ordenado por severidade.
>
> Legenda: 🔴 crítico · 🟠 alto · 🟡 médio · ⚪ dívida técnica / polimento.
> `[confirmado]` = verificado no código · `[verificar]` = forte suspeita, precisa checar em runtime/ambiente.

---

## 🔴 Críticos

### C1. Trigger SQL de criação de usuário conflita com o fluxo de registro da API `[confirmado]`
**Onde:** `supabase_sync_trigger.sql` (função `handle_new_user`) vs. `AuthService.register` / `UsuarioRepositoryDb.create`.

**O que deveria fazer:** existir **um único** caminho de criação da linha `public.usuario`. Hoje o projeto tem a API criando o usuário (`AuthService` → `create()` → seta `tipo_perfil`, `auth_uid`, `nome` e depois `app_metadata.papel`).

**Problemas:**
1. **Coluna inexistente.** O trigger faz `INSERT INTO public.usuario (id, email, papel, ...)`, mas a coluna real é **`tipo_perfil`** (`tipoPerfilEnum('tipo_perfil')` em `schema/identidade.ts`), não `papel`. Se este trigger estiver aplicado no banco, **todo signup falha** com `column "papel" does not exist` — e como ele roda `AFTER INSERT ON auth.users`, derruba a criação do próprio usuário no Supabase Auth.
2. **Não seta `auth_uid` nem `nome`.** O trigger grava só `id = auth.users.id`, deixando `auth_uid` NULL. Aí o `AuthService.register` chama `findByAuthUid()` (busca por `auth_uid`) → retorna null → tenta `create()` com `id = authUid` → colide na PK → é traduzido para `EmailJaCadastradoError` → 409 "e-mail já cadastrado" para um usuário **novo e legítimo**.
3. **Papel fixo.** O trigger cria sempre `'estudante'`, sabotando cadastro de professor/gestor.

**Correção sugerida:** decidir **uma** estratégia. Recomendado: **remover o trigger** e deixar a API como fonte única (ela já é idempotente e trata corridas). Se quiser manter o trigger como rede de segurança, corrigir a coluna (`tipo_perfil`), popular `auth_uid`/`nome`, e fazer a API tratar a linha pré-existente (buscar por `id` além de `auth_uid`).

---

### C2. Fórmula de nível divergente em 3 lugares `[confirmado]`
**Onde:**
- Backend (fonte da verdade): `gamificacao/nivel.ts` → `nivelDeXp` — curva **não-linear** (≤100=N1, ≤250=N2, ≤500=N3, depois blocos que dobram).
- Frontend otimista: `web/lib/user-context.tsx` → `calcularNivelClient` = `Math.floor(xp / 500) + 1` — **linear**.
- Barra de progresso: `web/app/components/AppShell.tsx` → `progressoPorcento = (xp % 100) / 100 * 100` — **terceira** régua (cada 100 XP).

**O que deveria fazer:** nível e progresso exibidos deveriam bater com o cálculo do servidor.

**Problema:** ao ganhar XP, `addXP` recalcula o nível pela fórmula linear e a UI mostra um nível **diferente** do que o servidor devolve no próximo `/me`. Ex.: `xp=600` → cliente diz nível 2, servidor diz nível 4. A barra (`xp % 100`) não corresponde a nenhuma das duas.

**Correção sugerida:** exportar a curva de `nivel.ts` para um pacote compartilhado (ex.: `@notaa/contracts` ou `@notaa/engines`) e consumir a **mesma** função no front (nível + limites do bloco atual via `calcularProgressaoNivel`). Eliminar `calcularNivelClient` e o `xp % 100`.

---

## 🟠 Altos

### A1. Streak calculado em UTC, ignorando o fuso do aluno `[confirmado]`
**Onde:** `gamificacao.service.ts` → `hojeISO()` = `new Date().toISOString().slice(0,10)`.

**O que deveria fazer:** o contrato (`ports.ts`, `setStreak`) diz *"fuso do estudante já resolvido pela Orquestração"* — a virada do dia deveria seguir o fuso do usuário.

**Problema:** usa a data **UTC**. Um aluno no Brasil (UTC−3) estudando às 22h local já está no "dia seguinte" em UTC → a ofensiva pode contar dia duplicado, ou quebrar indevidamente perto da meia-noite.

**Correção sugerida:** resolver a data no fuso do aluno (guardar timezone no perfil ou receber do cliente) antes de comparar dias. Enquanto não houver fuso, ao menos padronizar em America/Sao_Paulo em vez de UTC.

### A2. Dashboard e TopBar não reagem após atividades (bug #4 do handoff, ainda aberto) `[confirmado]`
**Onde:** `web/app/(estudante)/dashboard/page.tsx` (carrega em `useEffect([])`), `quiz/page.tsx`, `simulado/page.tsx`, `tutor/page.tsx`.

**O que deveria fazer:** depois de responder questões, o Mapa Cognitivo (θ), XP, nível e streak deveriam atualizar ao voltar ao dashboard/TopBar.

**Problemas:**
- O dashboard só busca dados **no mount** — sem refetch ao revisitar a rota.
- O quiz **não** chama `addXP` nem `refreshPerfil` após submeter respostas → TopBar não atualiza.
- `simulado`/`tutor` chamam `addXP(...)` (otimista, fórmula errada — ver C2) mas **nunca** `refreshPerfil()` → o valor otimista nunca é reconciliado com o servidor.

**Correção sugerida:** após concluir sessão de quiz/simulado, chamar `refreshPerfil()`; no dashboard, refazer o fetch ao focar a rota (ex.: revalidar em `useEffect` dependente de `pathname`/foco, ou `router.refresh()`), garantindo o refetch do `getThetaResumo`.

### A3. `UserProvider` com `useEffect([])` lendo `authUid` (closure obsoleto) `[confirmado]`
**Onde:** `web/lib/user-context.tsx` — o efeito de hidratação tem deps `[]` mas usa `authUid`.

**O que deveria fazer:** restaurar o snapshot e buscar `/me` **para o usuário atual**, reagindo a troca de sessão.

**Problema:** se a sessão resolver **depois** do mount (ou o usuário trocar de conta sem full reload), `authUid` no efeito fica preso ao valor inicial (possivelmente `null`) → snapshot não restaurado / `/me` não refeito. Relaciona-se ao bug #1 do handoff (tela resetando no refresh).

**Correção sugerida:** incluir `authUid` nas deps (ou um efeito separado que dispara quando `authUid` muda), com guarda para não duplicar fetch.

---

## 🟡 Médios

### M1. `/me.gamificacao` lê do cache, não do ledger `[confirmado]`
**Onde:** `me.controller.ts` — lê `perfil_cognitivo_4d.xpTotal/ofensivaDias` (cache sincronizado por `syncCachePerfil`), não o `xp_ledger` real.

**Problema:** coerência depende de `syncCachePerfil` rodar sempre; se falhar/lag, o XP exibido fica defasado. Pior: o bloco só monta `gamificacao` quando `p4d.xpTotal != null` — **antes de concluir o onboarding** (sem `PerfilCognitivo4D`), `gamificacao` volta `null` e qualquer XP ganho nesse intervalo **não aparece**.

**Correção sugerida:** ou ler o total do ledger no `/me`, ou garantir que o `PerfilCognitivo4D` exista desde o registro (com XP=0) e tratar o cache como aceleração, não como fonte.

### M2. Itens gerados por IA poluem o banco de itens de forma persistente `[verificar]`
**Onde:** `quiz.service.ts` → `getOrGenerateNextItem` → `repo.addItem(novoItem)` (marcado `naoCalibrado`).

**Problema:** cada vez que o pool TRI esgota, um item `ai-...` com parâmetros TRI chutados é **inserido no banco** (`bancoDeItens`). Ao longo do tempo o banco enche de itens não-calibrados que voltam ao pool (`getItemPool` filtra por `ativo`, não por calibração) e podem ser reapresentados. Confirmar se `addItem` grava no banco global ou é escopado à sessão.

**Correção sugerida:** ou não persistir itens de IA no pool global (mantê-los efêmeros/por-sessão), ou excluí-los da seleção adaptativa até calibração, ou marcar TTL/limpeza.

### M3. `updateAbility` é stateless — `erroPadrao` não é o SE da sessão `[confirmado]`
**Onde:** `engines/tri/src/update-ability.ts` (o próprio comentário reconhece).

**Problema:** o `erroPadrao` retornado é a aproximação de **um item** (`1/√I`), não o erro-padrão acumulado da sessão. Qualquer UI que mostre "confiança/precisão da estimativa" estará imprecisa; critérios de parada baseados em SE não funcionam.

**Correção sugerida:** acumular informação de Fisher por sessão na camada de orquestração (somar `I(θ)` de cada tentativa) e derivar `SE = 1/√ΣI`.

### M4. `POST /quiz/generate` sem idempotência e com custo por clique `[verificar]`
**Onde:** `quiz.controller.ts` (`generate`) + `quiz.service.ts` (`temperature: 1.1`).

**Problema:** cada chamada dispara uma geração no Gemini (custo/cota) sem chave de idempotência; duplo-clique ou retry do cliente = duas questões e duas cobranças. Confirmar se o `rate-limiter.interceptor` está de fato aplicado a esta rota (existe em `ai/rate-limiter/`, mas o quiz importa `AiModule` — verificar cobertura).

**Correção sugerida:** aplicar o rate-limiter a `/quiz/generate`, e/ou aceitar `Idempotency-Key` como no `submitAnswer`.

### M5. Anti-repetição do quiz IA é só probabilística `[confirmado]`
**Onde:** `quiz.service.ts` — envia últimos 8 enunciados no prompt e pede "não repita".

**Problema:** depende do modelo obedecer; não há checagem determinística de similaridade. Repetições ainda podem passar.

**Correção sugerida:** após gerar, comparar (hash/normalização/embedding) contra o histórico e regenerar se colidir — antes de devolver ao aluno.

---

## ⚪ Dívidas técnicas / polimento

### D1. `.env.production.example` cita "Render/Railway", mas o deploy é Vercel serverless `[confirmado]`
`apps/api/api/index.ts` + `vercel.json` indicam Vercel; o exemplo de env fala em Render/Railway e `PORT=8080`. Alinhar a doc para não configurar variáveis no host errado.

### D2. Repositórios `*.repository.memory.ts` convivem sem estar "wired" `[confirmado]`
Todos os módulos usam os adaptadores Drizzle (`useFactory` com `DB_CLIENT`). Os `*.memory.ts` existem para teste/fallback mas podem confundir. Documentar claramente ou mover para pasta de testes.

### D3. Log de toda requisição com `Origin` no `main.ts` `[confirmado]`
`fastify.addHook('onRequest', ...)` faz `console.log` por request. Ruído em produção e potencial dado sensível. Rebaixar para nível debug/condicional a `LOG_LEVEL`.

### D4. `x-development-mode` enviado pelo `api-client` em dev `[confirmado]`
O front injeta `x-development-mode: true` quando `NODE_ENV === development`. O bypass no back é fail-closed (`isDevBypassEnabled` exige `ENABLE_DEV_AUTH_BYPASS` + não-Vercel), então é seguro — mas vale documentar essa dependência para não relaxarem a guarda no futuro.

### D5. `AiController` (`/ai/test`, `/ai/models`) consome cota real e expõe conta Google `[confirmado, mitigado]`
Já está `@Roles('admin')`. Manter atenção: `/ai/models` lista modelos da conta e `/ai/test` gasta cota; garantir que nunca vire `@Public()`.

### D6. Divergência de modelo Gemini entre docs de env `[confirmado]`
`.env.production.example` sugere `gemini-1.5-pro` para socrática/redação em `LLM_MODEL_*`, mas o `GeminiAdapter` usa `GEMINI_MODEL` (default `gemini-2.5-flash`) para tudo — as variáveis `LLM_MODEL_SOCRATICA/REDACAO` não parecem consumidas pelo adaptador. Remover as variáveis mortas ou implementar seleção de modelo por integração.

---

## Sugestão de priorização

1. **C1** (registro quebrado é bloqueador de produto) → decidir trigger vs. API.
2. **C2 + A2 + A3** (nível/XP/streak inconsistentes e sem reatividade) → experiência central de gamificação.
3. **A1** (fuso do streak).
4. **M1–M5** conforme o produto amadurece (calibração TRI, custo de IA).
5. **D1–D6** limpeza contínua.

> Observação: itens `[verificar]` (M2, M4) merecem uma checagem rápida em runtime/DB antes de virar tarefa — o restante está confirmado na leitura do código.
