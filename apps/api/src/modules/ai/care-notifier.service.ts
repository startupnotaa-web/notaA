import { Inject, Injectable, Logger } from '@nestjs/common';
import { Database, and, eq, notificacaoCuidado, usuario, vinculoResponsavel } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';

type Escalonamento = 'responsavel_escola' | 'flag_interno';

/**
 * Notificador do protocolo de cuidado (decisão Q-01, doc 10 §6): quando uma
 * `ocorrencia_risco` escala para `responsavel_escola`, registra UMA notificação
 * por destinatário vinculado — responsáveis com vínculo ATIVO e, quando o
 * estudante pertence a uma escola, os gestores dela.
 *
 * A entrega hoje é in-app (o Portal Responsável/Escola lê `notificacao_cuidado`
 * com status 'pendente'); um canal ativo (e-mail/push) marca `enviada` quando
 * existir. `flag_interno` não notifica externos — a ocorrência já fica visível
 * para revisão humana via `status_acompanhamento` (LGPD × dever de cuidado).
 */
@Injectable()
export class CareNotifierService {
  private readonly logger = new Logger('CareNotifier');

  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async notificar(input: {
    ocorrenciaId: string;
    estudanteId: string;
    escalonamento: Escalonamento;
  }): Promise<{ destinatarios: number }> {
    if (input.escalonamento !== 'responsavel_escola') return { destinatarios: 0 };

    const destinatarios: { id: string; papel: 'responsavel' | 'gestor' }[] = [];

    // 1. Responsáveis com vínculo ativo (nunca notificar vínculo pendente/revogado).
    const responsaveis = await this.db
      .select({ id: vinculoResponsavel.responsavelId })
      .from(vinculoResponsavel)
      .where(
        and(
          eq(vinculoResponsavel.estudanteId, input.estudanteId),
          eq(vinculoResponsavel.status, 'ativo'),
        ),
      );
    destinatarios.push(...responsaveis.map((r) => ({ id: r.id, papel: 'responsavel' as const })));

    // 2. Gestores da escola do estudante (quando houver vínculo escolar).
    const [estudante] = await this.db
      .select({ escolaId: usuario.escolaId })
      .from(usuario)
      .where(eq(usuario.id, input.estudanteId))
      .limit(1);
    if (estudante?.escolaId) {
      const gestores = await this.db
        .select({ id: usuario.id })
        .from(usuario)
        .where(and(eq(usuario.escolaId, estudante.escolaId), eq(usuario.tipoPerfil, 'gestor')));
      destinatarios.push(...gestores.map((g) => ({ id: g.id, papel: 'gestor' as const })));
    }

    if (destinatarios.length === 0) {
      this.logger.warn(
        `protocolo de cuidado SEM destinatário vinculado (ocorrencia=${input.ocorrenciaId}) — apenas flag interno.`,
      );
      return { destinatarios: 0 };
    }

    await this.db.insert(notificacaoCuidado).values(
      destinatarios.map((d) => ({
        ocorrenciaId: input.ocorrenciaId,
        destinatarioId: d.id,
        papelDestinatario: d.papel,
      })),
    );
    this.logger.warn(
      `protocolo de cuidado: ${destinatarios.length} notificação(ões) registrada(s) (ocorrencia=${input.ocorrenciaId}).`,
    );
    return { destinatarios: destinatarios.length };
  }
}
