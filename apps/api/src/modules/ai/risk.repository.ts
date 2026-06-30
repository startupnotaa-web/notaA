import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import type { Database } from '@notaa/db';
import { ocorrenciaRisco, usuario } from '@notaa/db';
import {
  MOCK_DEV_USER_ID,
  MOCK_DEV_USER_EMAIL,
  MOCK_DEV_USER_NOME,
  isDevBypassEnabled,
} from '../../common/dev-user';

export interface RegistroRisco {
  estudanteId: string;
  origem: 'socratica' | 'redacao';
  referenciaId: string; // conversa_socratica.id ou redacao.id
  sinal: string;
  severidade: 'baixa' | 'media' | 'alta';
  acaoTomada: object;
}

/** Porta de persistência do protocolo de cuidado humano (ocorrencia_risco, doc 04 §6). */
export interface RiskRepositoryPort {
  registrarOcorrencia(input: RegistroRisco): Promise<{ ocorrenciaId: string }>;
}

/** Adaptador Drizzle real — grava append-only em `ocorrencia_risco` (acesso restrito). */
@Injectable()
export class RiskRepositoryDrizzle implements RiskRepositoryPort {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async registrarOcorrencia(input: RegistroRisco): Promise<{ ocorrenciaId: string }> {
    // Garante o usuário mock em dev (FK estudante_id) — mesmo padrão dos demais adaptadores.
    if (isDevBypassEnabled() && input.estudanteId === MOCK_DEV_USER_ID) {
      await this.db
        .insert(usuario)
        .values({
          id: MOCK_DEV_USER_ID,
          authUid: MOCK_DEV_USER_ID,
          nome: MOCK_DEV_USER_NOME,
          email: MOCK_DEV_USER_EMAIL,
          tipoPerfil: 'estudante',
          status: 'ativo',
        })
        .onConflictDoNothing();
    }

    const [row] = await this.db
      .insert(ocorrenciaRisco)
      .values({
        estudanteId: input.estudanteId,
        origem: input.origem,
        referenciaId: input.referenciaId,
        sinal: input.sinal,
        severidade: input.severidade,
        acaoTomada: input.acaoTomada,
        statusAcompanhamento: 'aberto',
      })
      .returning({ id: ocorrenciaRisco.id });

    return { ocorrenciaId: row!.id };
  }
}
