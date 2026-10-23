import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

// Landing pública: pedidos de contato, demonstração e lista de espera.
// Lead não é conta: não tem `usuario_id`, e nenhuma tela do produto lê esta tabela.
// RLS ligada e SEM política: só a API (service role) grava e só quem tem acesso
// ao banco (painel do Supabase) lê. Ver supabase/migrations/0018_lead_landing.sql.

export const leadLanding = pgTable(
  'lead_landing',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    origem: text('origem').notNull(),
    nome: text('nome').notNull(),
    email: text('email').notNull(), // já normalizado em minúsculas pelo contrato
    /** Instituição (demo) ou faculdade e curso (espera). Vazio no contato da home. */
    organizacao: text('organizacao'),
    /** Só no contato da home: aluno, professor, gestor ou faculdade. */
    perfil: text('perfil'),
    consentimentoEm: timestamp('consentimento_em', { withTimezone: true }).notNull().defaultNow(),
    versaoPolitica: text('versao_politica').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Mesmo e-mail na mesma origem vira um só lead: reenviar o formulário não duplica.
    unique('uq_lead_landing_origem_email').on(t.origem, t.email),
    check('ck_lead_landing_origem', sql`${t.origem} IN ('contato', 'demo', 'espera')`),
    check('ck_lead_landing_perfil', sql`${t.perfil} IS NULL OR ${t.perfil} IN ('aluno', 'professor', 'gestor', 'faculdade')`),
    index('idx_lead_landing_criado_em').on(t.criadoEm),
  ],
);

/**
 * Contador do limite de envios por origem de rede. `chave_hash` é um HMAC do IP com um segredo
 * da API: o IP em si nunca é gravado. Uma linha por chave e hora.
 */
export const leadRateLimit = pgTable(
  'lead_rate_limit',
  {
    chaveHash: text('chave_hash').notNull(),
    janelaInicio: timestamp('janela_inicio', { withTimezone: true }).notNull(),
    contagem: integer('contagem').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.chaveHash, t.janelaInicio] }),
    index('idx_lead_rate_limit_janela').on(t.janelaInicio),
  ],
);
