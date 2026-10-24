-- Landing pública: leads de contato, demonstração e lista de espera (2026-10-19).
--
-- Escrita à mão, idempotente, no estilo da 0016. O snapshot em
-- meta/0018_snapshot.json vem de `drizzle-kit generate` a partir do schema TS
-- (packages/db/src/schema/lead.ts); o SQL que o drizzle-kit gerou foi descartado
-- porque ele não conhece o ENABLE ROW LEVEL SECURITY nem os REVOKEs daqui.
--
-- Quem grava: só a API (conexão service role), em POST /leads.
-- Quem lê: só quem tem acesso ao banco (painel do Supabase). Nenhuma tela do
-- produto lê estas tabelas, e não existe política de leitura para anon nem para
-- authenticated: RLS ligada e SEM política = negado por padrão, o mesmo critério
-- das tabelas só-service-role de supabase/policies/0003.
--
-- Prazo de retenção dos leads: [PLACEHOLDER: prazo de retenção] — definir com o
-- jurídico e registrar em /privacidade antes de abrir a landing ao público.

CREATE TABLE IF NOT EXISTS lead_landing (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem           text NOT NULL,
  nome             text NOT NULL,
  email            text NOT NULL,
  organizacao      text,
  perfil           text,
  consentimento_em timestamptz NOT NULL DEFAULT now(),
  versao_politica  text NOT NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_lead_landing_origem CHECK (origem IN ('contato', 'demo', 'espera')),
  CONSTRAINT ck_lead_landing_perfil CHECK (perfil IS NULL OR perfil IN ('aluno', 'professor', 'gestor', 'faculdade')),
  CONSTRAINT uq_lead_landing_origem_email UNIQUE (origem, email)
);

CREATE INDEX IF NOT EXISTS idx_lead_landing_criado_em ON lead_landing (criado_em);

-- Contador do limite de envios. `chave_hash` é HMAC do IP com segredo da API: o IP não é gravado.
CREATE TABLE IF NOT EXISTS lead_rate_limit (
  chave_hash     text NOT NULL,
  janela_inicio  timestamptz NOT NULL,
  contagem       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (chave_hash, janela_inicio)
);

CREATE INDEX IF NOT EXISTS idx_lead_rate_limit_janela ON lead_rate_limit (janela_inicio);

-- RLS ligada, sem política: anon e authenticated não leem nem escrevem.
ALTER TABLE lead_landing ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_rate_limit ENABLE ROW LEVEL SECURITY;

-- Defesa em profundidade: o privilégio some mesmo que alguém crie uma política depois.
-- O Supabase dá ALL nas tabelas novas a anon e authenticated por padrão; aqui é retirado.
REVOKE ALL ON lead_landing FROM anon, authenticated;
REVOKE ALL ON lead_rate_limit FROM anon, authenticated;
