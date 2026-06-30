-- RLS — segunda passada (completa as 15 tabelas que faltavam do TODO em
-- 0001_rls_estudante.sql). Resolve o advisory crítico do Supabase: "37 tabelas
-- com RLS desabilitado, totalmente expostas a anon/authenticated".
--
-- Critério usado por tabela:
--   * Catálogo público, sem dado sensível → `for select using (true)`,
--     escrita SEM policy (negada por padrão com RLS ligada = só service role).
--   * Tabela com coluna sensível (ex.: banco_de_itens.gabarito) ou ainda sem
--     lógica de escopo na API (institucional, billing, governança, pós-MVP)
--     → RLS ligada, NENHUMA policy = acesso só via service role (API).
--   * usuario → cada um vê o próprio registro.

-- ── Identidade ──

alter table usuario enable row level security;
create policy p_usuario_own on usuario
  for select using (id = auth_current_usuario_id());

-- escola, turma, matricula_turma: Portal da Escola (E11) ainda não implementado
-- na API — sem lógica de escopo por professor/gestor ainda. RLS ligada, sem
-- policy = só service role, até o módulo `escola` crescer (doc 09 §6).
alter table escola enable row level security;
alter table turma enable row level security;
alter table matricula_turma enable row level security;

-- ── Catálogos públicos (sem dado sensível) ──

alter table plano enable row level security;
create policy p_plano_select_publico on plano
  for select using (true);

alter table conquista enable row level security;
create policy p_conquista_select_publico on conquista
  for select using (true);

alter table tema_redacao enable row level security;
create policy p_tema_redacao_select_publico on tema_redacao
  for select using (true);

alter table rubrica_redacao enable row level security;
create policy p_rubrica_redacao_select_publico on rubrica_redacao
  for select using (true);

-- ⚠️ banco_de_itens tem a coluna `gabarito` — NUNCA dar select público aqui.
-- A API (service role) é quem entrega ItemPublico (sem gabarito) ao cliente.
alter table banco_de_itens enable row level security;

-- ── Comercial / governança / internos — service role apenas ──

alter table assinatura enable row level security;
alter table contador_rate_limit enable row level security;
alter table prompt_versionado enable row level security;

-- ── Pós-MVP (Fase 5) — ainda sem lógica de escopo na API ──

alter table ranking_snapshot enable row level security;
alter table duelo enable row level security;
alter table duelo_participante enable row level security;
