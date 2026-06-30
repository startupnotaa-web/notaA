-- RLS inicial (docs/10-seguranca-e-privacidade.md §2) — 2ª barreira de defesa.
-- A API de domínio acessa via service role (contorna RLS por padrão no Supabase);
-- estas políticas protegem contra acesso direto indevido (bug na app, chave exposta, etc).
--
-- Cobertura desta primeira passada: tabelas de dado de estudante com `estudante_id`
-- direto ou alcançável por join de 1 nível. NÃO exaustivo das 37 tabelas — ver TODO
-- no final. Estender conforme novos módulos da API forem implementados (passos 5+).

-- Helper: resolve usuario.id a partir do JWT do Supabase Auth (auth.uid() = usuario.auth_uid).
create or replace function auth_current_usuario_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from usuario where auth_uid = auth.uid()
$$;

-- ── Estudante: acesso só ao próprio dado ──

alter table tentativa_resposta enable row level security;
create policy p_tentativa_resposta_own on tentativa_resposta
  for select using (estudante_id = auth_current_usuario_id());

alter table habilidade_estudante enable row level security;
create policy p_habilidade_estudante_own on habilidade_estudante
  for select using (estudante_id = auth_current_usuario_id());

alter table theta_evento enable row level security;
create policy p_theta_evento_own on theta_evento
  for select using (estudante_id = auth_current_usuario_id());

alter table sessao_avaliativa enable row level security;
create policy p_sessao_avaliativa_own on sessao_avaliativa
  for select using (estudante_id = auth_current_usuario_id());

alter table perfil_onboarding enable row level security;
create policy p_perfil_onboarding_own on perfil_onboarding
  for all using (estudante_id = auth_current_usuario_id());

alter table perfil_cognitivo_4d enable row level security;
create policy p_perfil_cognitivo_4d_own on perfil_cognitivo_4d
  for select using (estudante_id = auth_current_usuario_id());

alter table perfil_cognitivo_evento enable row level security;
create policy p_perfil_cognitivo_evento_own on perfil_cognitivo_evento
  for select using (estudante_id = auth_current_usuario_id());

alter table adaptacao_ativa enable row level security;
create policy p_adaptacao_ativa_own on adaptacao_ativa
  for select using (estudante_id = auth_current_usuario_id());

alter table ocorrencia_erro enable row level security;
create policy p_ocorrencia_erro_own on ocorrencia_erro
  for select using (estudante_id = auth_current_usuario_id());

alter table redacao enable row level security;
create policy p_redacao_own on redacao
  for all using (estudante_id = auth_current_usuario_id());

alter table conversa_socratica enable row level security;
create policy p_conversa_socratica_own on conversa_socratica
  for all using (estudante_id = auth_current_usuario_id());

alter table xp_ledger enable row level security;
create policy p_xp_ledger_own on xp_ledger
  for select using (estudante_id = auth_current_usuario_id());

alter table streak enable row level security;
create policy p_streak_own on streak
  for select using (estudante_id = auth_current_usuario_id());

alter table conquista_concedida enable row level security;
create policy p_conquista_concedida_own on conquista_concedida
  for select using (estudante_id = auth_current_usuario_id());

-- ── Joins de 1 nível (acesso via tabela-pai) ──

alter table avaliacao_redacao enable row level security;
create policy p_avaliacao_redacao_own on avaliacao_redacao
  for select using (
    redacao_id in (select id from redacao where estudante_id = auth_current_usuario_id())
  );

alter table avaliacao_competencia enable row level security;
create policy p_avaliacao_competencia_own on avaliacao_competencia
  for select using (
    avaliacao_id in (
      select ar.id from avaliacao_redacao ar
      join redacao r on r.id = ar.redacao_id
      where r.estudante_id = auth_current_usuario_id()
    )
  );

alter table mensagem_socratica enable row level security;
create policy p_mensagem_socratica_own on mensagem_socratica
  for select using (
    conversa_id in (
      select id from conversa_socratica where estudante_id = auth_current_usuario_id()
    )
  );

-- ── Dado sensível (doc 04 §3, doc 10 §3) — titular OU responsável vinculado e ativo ──

alter table dado_sensivel_estudante enable row level security;
create policy p_dado_sensivel_titular_ou_responsavel on dado_sensivel_estudante
  for select using (
    estudante_id = auth_current_usuario_id()
    or estudante_id in (
      select estudante_id from vinculo_responsavel
      where responsavel_id = auth_current_usuario_id() and status = 'ativo'
    )
  );

-- ── Vínculo do responsável: cada parte vê o próprio vínculo ──

alter table vinculo_responsavel enable row level security;
create policy p_vinculo_responsavel_partes on vinculo_responsavel
  for select using (
    responsavel_id = auth_current_usuario_id() or estudante_id = auth_current_usuario_id()
  );

-- ── Acesso restrito por design — RLS habilitada, SEM policy de leitura para estudante ──
-- (qualquer leitura exige service role + auditoria; ver doc 10 §1/§6)

alter table ocorrencia_risco enable row level security;
alter table log_auditoria_admin enable row level security;
alter table log_uso_ia enable row level security;

-- TODO (próximos passos — RBAC de Professor/Gestor, doc 10 §1):
--   * Políticas de leitura AGREGADA para Professor (sua turma) e Gestor (sua escola)
--     sobre tentativa_resposta/habilidade_estudante/xp_ledger — depende do módulo
--     `auth` da API (passo 5) já resolver papel + escola_id/turma a partir do JWT.
--   * usuario, escola, turma, matricula_turma, assinatura, plano, conquista,
--     banco_de_itens, tema_redacao, rubrica_redacao, prompt_versionado,
--     ranking_snapshot, duelo*, contador_rate_limit — ainda sem RLS habilitada;
--     avaliar caso a caso (catálogos podem ser `for select using (true)` com
--     escrita restrita a service role; tabelas internas continuam service-role-only).
