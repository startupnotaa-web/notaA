-- RLS — terceira passada. Cobre as tabelas criadas DEPOIS de `0002_rls_restante.sql`
-- (módulos de trilha, quiz IA, PvP, certificados e simulado), que nasceram sem RLS
-- porque as migrations do Drizzle só geram schema — RLS vive aqui, neste diretório.
--
-- Critério por tabela, o mesmo dos dois arquivos anteriores:
--   * Dono direto → `for select using (<coluna_dono> = auth_current_usuario_id())`.
--   * Dono alcançável por join → subselect até a tabela que tem `estudante_id`.
--   * Catálogo com gabarito → RLS ligada, NENHUMA policy = só service role.
--   * Protocolo de cuidado → RLS ligada, NENHUMA policy = só service role.
--
-- Escrita continua sem policy em todas: negada por padrão com RLS ligada, ou seja,
-- só a API (service role) escreve. Depende de `auth_current_usuario_id()`, criada
-- em `0001_rls_estudante.sql`.

-- ── Dono direto: `estudante_id` ──

alter table trilha_estudo enable row level security;
create policy p_trilha_estudo_own on trilha_estudo
  for select using (estudante_id = auth_current_usuario_id());

alter table quiz_ia_gerado enable row level security;
create policy p_quiz_ia_gerado_own on quiz_ia_gerado
  for select using (estudante_id = auth_current_usuario_id());

-- ── Dono direto: `usuario_id` (estas duas fogem do nome `estudante_id`) ──

alter table batalhas_pvp enable row level security;
create policy p_batalhas_pvp_own on batalhas_pvp
  for select using (usuario_id = auth_current_usuario_id());

alter table certificados_conquista enable row level security;
create policy p_certificados_conquista_own on certificados_conquista
  for select using (usuario_id = auth_current_usuario_id());

-- ── Simulado: dono por join até `sessao_avaliativa` ──
-- `simulado_sessao.sessao_id` é PK e FK para `sessao_avaliativa.id` (o simulado
-- reusa a sessão em vez de duplicar o conceito — ver 0010_simulado_sessao.sql).

alter table simulado_sessao enable row level security;
create policy p_simulado_sessao_own on simulado_sessao
  for select using (
    sessao_id in (select id from sessao_avaliativa where estudante_id = auth_current_usuario_id())
  );

-- Join de 2 níveis: simulado_questao → simulado_sessao → sessao_avaliativa.
-- Expõe `item_id` (FK para banco_de_itens), mas isso não vaza gabarito: o
-- banco_de_itens continua sem policy, então o join do lado do cliente não resolve.
alter table simulado_questao enable row level security;
create policy p_simulado_questao_own on simulado_questao
  for select using (
    sessao_id in (
      select ss.sessao_id from simulado_sessao ss
      join sessao_avaliativa sa on sa.id = ss.sessao_id
      where sa.estudante_id = auth_current_usuario_id()
    )
  );

-- ── Catálogo com gabarito — service role apenas ──
-- ⚠️ `questoes_enem.correta` é o gabarito, mesmo caso de `banco_de_itens.gabarito`
-- no 0002. NUNCA dar `for select using (true)` aqui. A API entrega a questão sem
-- a coluna `correta` ao cliente.
alter table questoes_enem enable row level security;

-- ── Protocolo de cuidado — service role apenas ──
-- Mesmo padrão de `ocorrencia_risco`, `log_auditoria_admin` e `log_uso_ia` no 0001.
--
-- A linha em si não guarda texto livre — só referências (`ocorrencia_id`,
-- `destinatario_id`) e metadado (`papel_destinatario`, `canal`, `status`, datas);
-- o conteúdo sensível (`sinal`, `severidade`, `acao_tomada`) fica em
-- `ocorrencia_risco`, que já é service-role-only. Ainda assim, NÃO damos policy de
-- leitura ao destinatário: a lógica de escalonamento (decisão Q-01, doc 10 §6)
-- precisa ser aplicada pela API ANTES de qualquer revelação, e o banco não tem como
-- expressá-la. Uma policy `destinatario_id = auth_current_usuario_id()` revelaria a
-- existência e o timing de um evento de cuidado direto ao responsável — e, para
-- quem tem um único estudante vinculado (visível via `p_vinculo_responsavel_partes`),
-- isso identifica o estudante por dedução, sem passar pelo escalonamento.
--
-- O Portal Responsável/Escola lê estas notificações via API (service role).
alter table notificacao_cuidado enable row level security;
