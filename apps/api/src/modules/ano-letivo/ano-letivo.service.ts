import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AnoLetivo,
  AtualizarAnoLetivoRequest,
  CriarAnoLetivoRequest,
  Papel,
} from '@notaa/contracts';
import { Database, and, anoLetivo, anoLetivoPeriodo, asc, eq, isNull } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { EscopoService, type DonoDeTurma } from '../escopo/escopo.service';

function condicaoDoDono(dono: DonoDeTurma) {
  return dono.instituicaoId !== undefined
    ? and(
        eq(anoLetivoPeriodo.instituicaoId, dono.instituicaoId),
        isNull(anoLetivoPeriodo.professorDonoId),
      )
    : and(
        eq(anoLetivoPeriodo.professorDonoId, dono.professorDonoId),
        isNull(anoLetivoPeriodo.instituicaoId),
      );
}

/**
 * Ano letivo. O rótulo ("2026") é global da plataforma; as datas e o
 * arquivamento são de cada dono, porque calendário de instituição varia.
 *
 * Consequência prática: criar o ano letivo de uma instituição pode reaproveitar
 * um rótulo que outra já criou. O rótulo é um nome compartilhado, não um
 * registro privado.
 */
@Injectable()
export class AnoLetivoService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
  ) {}

  /** Os anos letivos deste dono, do mais recente para o mais antigo pelo rótulo. */
  async listar(usuarioId: string, papel: Papel): Promise<AnoLetivo[]> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);

    const linhas = await this.db
      .select({
        id: anoLetivo.id,
        rotulo: anoLetivo.rotulo,
        dataInicio: anoLetivoPeriodo.dataInicio,
        dataFim: anoLetivoPeriodo.dataFim,
        arquivado: anoLetivoPeriodo.arquivado,
      })
      .from(anoLetivoPeriodo)
      .innerJoin(anoLetivo, eq(anoLetivo.id, anoLetivoPeriodo.anoLetivoId))
      .where(condicaoDoDono(dono))
      .orderBy(asc(anoLetivo.rotulo));

    return linhas.map((l) => ({
      id: l.id,
      rotulo: l.rotulo,
      dataInicio: l.dataInicio ?? null,
      dataFim: l.dataFim ?? null,
      arquivado: l.arquivado,
    }));
  }

  /**
   * Cria o ano letivo para este dono. O rótulo global é criado só se ainda não
   * existir; o que é sempre novo é o período do dono.
   */
  async criar(
    usuarioId: string,
    papel: Papel,
    body: CriarAnoLetivoRequest,
  ): Promise<AnoLetivo> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);

    return this.db.transaction(async (tx) => {
      const [existente] = await tx
        .select({ id: anoLetivo.id })
        .from(anoLetivo)
        .where(eq(anoLetivo.rotulo, body.rotulo))
        .limit(1);

      let anoLetivoId = existente?.id;
      if (!anoLetivoId) {
        const [criado] = await tx
          .insert(anoLetivo)
          .values({ rotulo: body.rotulo })
          .returning({ id: anoLetivo.id });
        anoLetivoId = criado!.id;
      }

      const [jaTem] = await tx
        .select({ id: anoLetivoPeriodo.id })
        .from(anoLetivoPeriodo)
        .where(and(eq(anoLetivoPeriodo.anoLetivoId, anoLetivoId), condicaoDoDono(dono)))
        .limit(1);

      if (jaTem) {
        throw new ConflictException({
          error: { code: 'ANO_LETIVO_DUPLICADO', message: `O ano letivo ${body.rotulo} já existe.` },
        });
      }

      await tx.insert(anoLetivoPeriodo).values({
        anoLetivoId,
        instituicaoId: dono.instituicaoId ?? null,
        professorDonoId: dono.professorDonoId ?? null,
        dataInicio: body.dataInicio ?? null,
        dataFim: body.dataFim ?? null,
      });

      return {
        id: anoLetivoId,
        rotulo: body.rotulo,
        dataInicio: body.dataInicio ?? null,
        dataFim: body.dataFim ?? null,
        arquivado: false,
      };
    });
  }

  /**
   * Ajusta datas ou arquiva. Arquivar o ano é o que torna as turmas dele
   * somente leitura — o `arquivado` daqui é a fonte, e as consultas de turma o
   * respeitam.
   */
  async atualizar(
    usuarioId: string,
    papel: Papel,
    anoLetivoId: string,
    body: AtualizarAnoLetivoRequest,
  ): Promise<AnoLetivo> {
    const dono = await this.escopo.donoDoUsuario(usuarioId, papel);

    const alteracoes: Record<string, unknown> = {};
    if (body.dataInicio !== undefined) alteracoes.dataInicio = body.dataInicio;
    if (body.dataFim !== undefined) alteracoes.dataFim = body.dataFim;
    if (body.arquivado !== undefined) alteracoes.arquivado = body.arquivado;

    const atualizadas = await this.db
      .update(anoLetivoPeriodo)
      .set(alteracoes)
      .where(and(eq(anoLetivoPeriodo.anoLetivoId, anoLetivoId), condicaoDoDono(dono)))
      .returning({ id: anoLetivoPeriodo.id });

    // Nenhuma linha afetada significa "não é seu" ou "não existe" — a resposta é
    // a mesma de propósito, para não revelar ano letivo de outro dono.
    if (atualizadas.length === 0) {
      throw new NotFoundException({
        error: { code: 'ANO_LETIVO_NAO_ENCONTRADO', message: 'Ano letivo não encontrado.' },
      });
    }

    const lista = await this.listar(usuarioId, papel);
    const atual = lista.find((a) => a.id === anoLetivoId);
    if (!atual) {
      throw new NotFoundException({
        error: { code: 'ANO_LETIVO_NAO_ENCONTRADO', message: 'Ano letivo não encontrado.' },
      });
    }
    return atual;
  }
}
