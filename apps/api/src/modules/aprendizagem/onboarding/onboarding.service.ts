import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  OnboardingStepSchemas,
  type OnboardingState,
  type OnboardingStepResponse,
} from '@notaa/contracts';
import type { OnboardingRepositoryPort } from '@notaa/contracts';
import { ONBOARDING_REPOSITORY } from './onboarding.tokens';

const TOTAL_PASSOS = 8;
const PASSO_OPCIONAL = 7; // neurodivergência (I10, doc 10 §3) — pode ser pulado

interface PayloadPasso7 {
  neurodivergencia?: Record<string, boolean>;
  consentimentoBaseLegal?: string;
}

@Injectable()
export class OnboardingService {
  constructor(@Inject(ONBOARDING_REPOSITORY) private readonly repo: OnboardingRepositoryPort) {}

  async getState(estudanteId: string): Promise<OnboardingState> {
    return this.repo.getState(estudanteId);
  }

  async saveStep(
    estudanteId: string,
    passo: number,
    payload: unknown,
  ): Promise<OnboardingStepResponse> {
    if (passo < 1 || passo > 8) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'Passo deve estar entre 1 e 8.' },
      });
    }

    const schema = OnboardingStepSchemas[passo - 1]!;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Payload inválido para o passo ${passo}.`,
          details: parsed.error.flatten(),
        },
      });
    }

    if (passo === PASSO_OPCIONAL) {
      await this.validarConsentimentoDadoSensivel(estudanteId, parsed.data as PayloadPasso7);
    }

    return this.repo.saveStep(estudanteId, passo, parsed.data);
  }

  /**
   * LGPD/ECA (doc 10 §3, Q-07): neurodivergência é dado sensível de menor —
   * gravar exige consentimento do RESPONSÁVEL para <18. O fluxo de convite ao
   * responsável ainda não existe, então para menores a gravação é BLOQUEADA
   * (o passo continua opcional: pular nunca é bloqueado). Para ≥18, o próprio
   * titular consente, e o consentimento explícito é obrigatório.
   */
  private async validarConsentimentoDadoSensivel(
    estudanteId: string,
    dados: PayloadPasso7,
  ): Promise<void> {
    const marcouNeurodivergencia = Object.values(dados.neurodivergencia ?? {}).some(Boolean);
    if (!marcouNeurodivergencia) return; // pular o passo é sempre permitido

    const estado = await this.repo.getState(estudanteId);
    const idade = (estado.dados as { passo1?: { idade?: number } }).passo1?.idade;

    if (idade === undefined) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Informe sua idade (passo 1) antes de declarar neurodivergência.',
        },
      });
    }
    if (idade < 18) {
      throw new ForbiddenException({
        error: {
          code: 'CONSENTIMENTO_RESPONSAVEL_NECESSARIO',
          message:
            'Para menores de 18 anos, o registro de neurodivergência exige consentimento de um responsável — recurso em preparação. Você pode pular este passo e adicionar depois.',
        },
      });
    }
    if (!dados.consentimentoBaseLegal) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'O consentimento explícito é obrigatório para registrar neurodivergência.',
        },
      });
    }
  }

  async complete(estudanteId: string): Promise<{ concluido: true }> {
    const estado = await this.repo.getState(estudanteId);
    // Gate baseado em `passoAtual` (não na presença de cada chave `passoN` em
    // `dados`): o adaptador Drizzle mapeia passos para colunas tipadas e não
    // reconstrói chave para todo passo (passo 1/nome mora em `usuario`, passo 7
    // é opcional, passo 8 é só confirmação). `passoAtual` avança a cada PUT e é
    // comum aos dois adaptadores; chegar ao passo 8 (confirmação) ⇒ concluiu os
    // obrigatórios. O passo 7 (neurodivergência) é opcional (doc 10 §3).
    if (estado.passoAtual < TOTAL_PASSOS) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Conclua todos os passos antes de finalizar (passo atual: ${estado.passoAtual}/${TOTAL_PASSOS}; o passo ${PASSO_OPCIONAL} é opcional, doc 10 §3).`,
        },
      });
    }
    await this.repo.complete(estudanteId);
    return { concluido: true };
  }
}
