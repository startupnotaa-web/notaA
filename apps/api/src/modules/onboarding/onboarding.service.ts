import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  OnboardingStepSchemas,
  type OnboardingState,
  type OnboardingStepResponse,
} from '@notaa/contracts';
import type { OnboardingRepositoryPort } from '@notaa/contracts';
import { ONBOARDING_REPOSITORY } from './onboarding.tokens';

const TOTAL_PASSOS = 8;
const PASSO_OPCIONAL = 7; // neurodivergência (I10, doc 10 §3) — pode ser pulado

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

    return this.repo.saveStep(estudanteId, passo, parsed.data);
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
