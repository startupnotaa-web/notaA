import { z } from 'zod';

// Formulários públicos da landing (contato, demonstração, lista de espera).
// O mesmo schema roda no navegador (mensagem ao lado do campo) e na API (a
// validação que vale). Sem `usuario_id`: lead não é conta, é só um pedido de contato.

export const LEAD_ORIGENS = ['contato', 'demo', 'espera'] as const;
export type LeadOrigem = (typeof LEAD_ORIGENS)[number];

/** Perfis do select "Eu sou" da home. */
export const LEAD_PERFIS = ['aluno', 'professor', 'gestor', 'faculdade'] as const;
export type LeadPerfil = (typeof LEAD_PERFIS)[number];

/**
 * Versão do texto de /privacidade que a pessoa viu ao marcar a autorização.
 * Troque quando a política mudar de verdade; a versão vai gravada com o lead.
 */
export const VERSAO_POLITICA_LEAD = 'rascunho-2026-10';

const nome = z.string().trim().min(1, 'Informe seu nome.').max(120, 'Use até 120 caracteres no nome.');
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe um e-mail válido, como nome@instituicao.com.br.')
  .max(254, 'Esse e-mail é longo demais. Confira se está certo.')
  .email('Informe um e-mail válido, como nome@instituicao.com.br.');

const comuns = {
  /** Sem autorização marcada, o formulário não é aceito (LGPD). */
  consentimento: z.literal(true, {
    errorMap: () => ({ message: 'Marque a autorização para enviarmos o formulário.' }),
  }),
  versaoPolitica: z.string().min(1).max(40),
  /**
   * Isca para robô: o campo existe no HTML, escondido, e pessoa nenhuma o preenche.
   * O schema aceita qualquer texto (e a ausência dele) para a API poder descartar em silêncio, em vez de
   * responder erro e ensinar o robô que foi pego.
   */
  website: z.string().max(200).optional(),
};

export const LeadContatoSchema = z.object({
  origem: z.literal('contato'),
  nome,
  email,
  perfil: z.enum(LEAD_PERFIS, { errorMap: () => ({ message: 'Escolha quem você é.' }) }),
  ...comuns,
});

export const LeadDemoSchema = z.object({
  origem: z.literal('demo'),
  nome,
  instituicao: z.string().trim().min(1, 'Informe o nome da instituição.').max(160, 'Use até 160 caracteres.'),
  email,
  ...comuns,
});

export const LeadEsperaSchema = z.object({
  origem: z.literal('espera'),
  nome,
  faculdadeCurso: z.string().trim().min(1, 'Informe a faculdade e o curso.').max(200, 'Use até 200 caracteres.'),
  email,
  ...comuns,
});

export const CriarLeadRequestSchema = z.discriminatedUnion('origem', [
  LeadContatoSchema,
  LeadDemoSchema,
  LeadEsperaSchema,
]);
export type CriarLeadRequest = z.infer<typeof CriarLeadRequestSchema>;

/** Schema de cada formulário, para o navegador validar só o que a tela mostra. */
export const LEAD_SCHEMAS = {
  contato: LeadContatoSchema,
  demo: LeadDemoSchema,
  espera: LeadEsperaSchema,
} as const;

export const CriarLeadResponseSchema = z.object({ ok: z.literal(true) });
export type CriarLeadResponse = z.infer<typeof CriarLeadResponseSchema>;

/** O que a API grava de um lead já validado. Sem a isca (`website`) e sem IP. */
export interface LeadParaGravar {
  origem: LeadOrigem;
  nome: string;
  email: string;
  organizacao: string | null;
  perfil: LeadPerfil | null;
  versaoPolitica: string;
}

/** Porta de persistência dos leads (adaptador Drizzle em @notaa/db). */
export interface LeadRepositoryPort {
  /** Conta mais um envio da `chaveHash` na hora corrente e devolve o total da hora. */
  consumirJanela(chaveHash: string): Promise<number>;
  /** `repetido` quando o e-mail já enviou o mesmo formulário: o chamador responde igual, sem revelar. */
  registrar(lead: LeadParaGravar): Promise<'criado' | 'repetido'>;
}
