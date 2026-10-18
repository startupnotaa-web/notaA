import { z } from 'zod';

// Convite do responsável (migração 0016). A instituição gera o convite para um
// contato que ela já cadastrou; o responsável autenticado o aceita, concorda
// com o termo e só então a conta dele é ligada ao cadastro do aluno.

/**
 * Versão do termo de consentimento do responsável. O TEXTO do termo é jurídico
 * e vive na tela de aceite; aqui só a versão, que é o que se grava e se exige.
 * Mudar o termo = nova versão = novo consentimento.
 */
export const VERSAO_TERMO_RESPONSAVEL = '2026-10-v1';

/** Validade do convite, em dias. */
export const DIAS_VALIDADE_CONVITE_RESPONSAVEL = 7;

export const ConviteResponsavelCriadoSchema = z.object({
  /** Credencial em claro. Só aparece aqui, uma vez; o banco guarda o hash. */
  token: z.string(),
  expiraEm: z.string(),
});
export type ConviteResponsavelCriado = z.infer<typeof ConviteResponsavelCriadoSchema>;

export const AceitarConviteResponsavelRequestSchema = z.object({
  token: z.string().trim().min(20).max(200),
  /** Aceite explícito do termo; sem isso o convite não é consumido. */
  aceitaTermo: z.literal(true),
  versaoTermo: z.literal(VERSAO_TERMO_RESPONSAVEL),
});
export type AceitarConviteResponsavelRequest = z.infer<typeof AceitarConviteResponsavelRequestSchema>;

/** Resposta do aceite: de propósito, nenhum dado de aluno nem de instituição. */
export const ConviteResponsavelAceitoSchema = z.object({ aceito: z.literal(true) });
export type ConviteResponsavelAceito = z.infer<typeof ConviteResponsavelAceitoSchema>;
