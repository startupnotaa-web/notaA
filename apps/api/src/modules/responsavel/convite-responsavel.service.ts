import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DIAS_VALIDADE_CONVITE_RESPONSAVEL,
  type AceitarConviteResponsavelRequest,
  type ConviteResponsavelAceito,
  type ConviteResponsavelCriado,
} from '@notaa/contracts';
import {
  Database,
  and,
  consentimentoResponsavel,
  conviteResponsavel,
  eq,
  gt,
  isNull,
  registrarAuditoria,
  responsavelAluno,
  sql,
  usuario,
} from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { EscopoService } from '../escopo/escopo.service';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// SQLSTATE 23505 = unique_violation.
function temViolacaoDeUnicidade(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

/**
 * Uma resposta só para token inexistente, já usado, expirado ou revogado: quem
 * tenta adivinhar convites não aprende nada, e a resposta nunca cita aluno.
 */
function conviteInvalido(): never {
  throw new NotFoundException({
    error: {
      code: 'CONVITE_INVALIDO',
      message: 'Este convite é inválido, já foi usado ou expirou. Peça um novo à instituição.',
    },
  });
}

/** SHA-256 em hex. O token tem 256 bits de entropia, então hash sem sal basta. */
function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Convite para o responsável ligar a própria conta ao contato que a instituição
 * cadastrou (migração 0016). É a única forma de um `responsavel_aluno` ganhar
 * `usuario_id`: a importação grava só contato. O aceite grava o consentimento
 * na mesma transação, e é o consentimento que abre a leitura do aluno por RLS.
 */
@Injectable()
export class ConviteResponsavelService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
  ) {}

  /** Gestão ou coordenação emite. A instituição vem do banco, pelo usuário do token. */
  async criarConvite(
    usuarioId: string,
    papel: string,
    responsavelAlunoId: string,
  ): Promise<ConviteResponsavelCriado> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const [contato] = await this.db
      .select({ usuarioId: responsavelAluno.usuarioId })
      .from(responsavelAluno)
      .where(
        and(eq(responsavelAluno.id, responsavelAlunoId), eq(responsavelAluno.instituicaoId, instituicaoId)),
      )
      .limit(1);
    if (!contato) {
      throw new NotFoundException({
        error: { code: 'NAO_ENCONTRADO', message: 'Responsável não encontrado.' },
      });
    }
    if (contato.usuarioId) {
      throw new ConflictException({
        error: {
          code: 'CONTATO_JA_VINCULADO',
          message: 'Este responsável já está ligado a uma conta.',
        },
      });
    }

    const token = randomBytes(32).toString('base64url');
    const expiraEm = new Date(Date.now() + DIAS_VALIDADE_CONVITE_RESPONSAVEL * MS_POR_DIA);
    await this.db.transaction(async (tx) => {
      // Só o convite mais novo vale.
      await tx
        .update(conviteResponsavel)
        .set({ revogadoEm: new Date() })
        .where(
          and(
            eq(conviteResponsavel.responsavelAlunoId, responsavelAlunoId),
            eq(conviteResponsavel.instituicaoId, instituicaoId),
            isNull(conviteResponsavel.usadoEm),
            isNull(conviteResponsavel.revogadoEm),
          ),
        );
      const [criado] = await tx
        .insert(conviteResponsavel)
        .values({
          instituicaoId,
          responsavelAlunoId,
          tokenHash: hashDoToken(token),
          expiraEm,
          criadoPor: usuarioId,
        })
        .returning({ id: conviteResponsavel.id });
      await registrarAuditoria(tx, {
        instituicaoId,
        atorId: usuarioId,
        papel,
        acao: 'convite_responsavel.criado',
        entidade: 'convite_responsavel',
        entidadeId: criado!.id,
        dados: { responsavelAlunoId, expiraEm: expiraEm.toISOString() },
      });
    });
    return { token, expiraEm: expiraEm.toISOString() };
  }

  /**
   * Quem aceita é o usuário autenticado, e só se for responsável. Instituição e
   * contato vêm do convite, nunca do corpo. Tudo numa transação: se qualquer
   * passo falha, o convite não é consumido.
   */
  async aceitarConvite(
    usuarioId: string,
    body: AceitarConviteResponsavelRequest,
  ): Promise<ConviteResponsavelAceito> {
    try {
      await this.db.transaction(async (tx) => {
        const [quem] = await tx
          .select({ tipoPerfil: usuario.tipoPerfil })
          .from(usuario)
          .where(eq(usuario.id, usuarioId))
          .limit(1);
        if (quem?.tipoPerfil !== 'responsavel') {
          throw new ForbiddenException({
            error: { code: 'FORA_DO_ESCOPO', message: 'Só uma conta de responsável aceita este convite.' },
          });
        }

        // Uso único: o UPDATE condicional é atômico, só uma chamada o vence.
        const [convite] = await tx
          .update(conviteResponsavel)
          .set({ usadoEm: new Date(), usadoPor: usuarioId })
          .where(
            and(
              eq(conviteResponsavel.tokenHash, hashDoToken(body.token)),
              isNull(conviteResponsavel.usadoEm),
              isNull(conviteResponsavel.revogadoEm),
              gt(conviteResponsavel.expiraEm, sql`now()`),
            ),
          )
          .returning({
            id: conviteResponsavel.id,
            instituicaoId: conviteResponsavel.instituicaoId,
            responsavelAlunoId: conviteResponsavel.responsavelAlunoId,
          });
        if (!convite) conviteInvalido();

        const [ligado] = await tx
          .update(responsavelAluno)
          .set({ usuarioId, atualizadoEm: new Date() })
          .where(
            and(
              eq(responsavelAluno.id, convite.responsavelAlunoId),
              eq(responsavelAluno.instituicaoId, convite.instituicaoId),
              isNull(responsavelAluno.usuarioId),
            ),
          )
          .returning({ id: responsavelAluno.id });
        if (!ligado) conviteInvalido();

        await tx.insert(consentimentoResponsavel).values({
          instituicaoId: convite.instituicaoId,
          responsavelAlunoId: convite.responsavelAlunoId,
          usuarioId,
          conviteId: convite.id,
          versaoTermo: body.versaoTermo,
        });
        await registrarAuditoria(tx, {
          instituicaoId: convite.instituicaoId,
          atorId: usuarioId,
          papel: 'responsavel',
          acao: 'responsavel.aceitou_convite',
          entidade: 'responsavel_aluno',
          entidadeId: convite.responsavelAlunoId,
          dados: {
            conviteId: convite.id,
            responsavelAlunoId: convite.responsavelAlunoId,
            versaoTermo: body.versaoTermo,
          },
        });
      });
    } catch (e) {
      // Consentimento duplicado para este contato e versão: mesma resposta dos demais casos.
      if (temViolacaoDeUnicidade(e)) conviteInvalido();
      throw e;
    }
    return { aceito: true };
  }
}
