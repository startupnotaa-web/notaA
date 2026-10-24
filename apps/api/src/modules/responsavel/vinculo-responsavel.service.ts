import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ListaVinculosPendentes, VinculoDecidido } from '@notaa/contracts';
import {
  Database,
  alunoInstituicao,
  and,
  asc,
  consentimentoResponsavel,
  eq,
  isNull,
  registrarAuditoria,
  responsavelAluno,
  solicitacaoVinculoResponsavel as solicitacao,
  usuario,
} from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { EscopoService } from '../escopo/escopo.service';

function naoEncontrado(): never {
  throw new NotFoundException({
    error: { code: 'NAO_ENCONTRADO', message: 'Solicitação não encontrada ou já decidida.' },
  });
}

/**
 * Vínculos de responsável que o e-mail não confirmou (migração 0017). A
 * coordenação decide aqui; antes disso a conta que pediu não lê nada. Gestão e
 * coordenação decidem, e a instituição vem do banco, pelo usuário do token.
 *
 * Aprovar liga a conta e grava o consentimento DE QUEM PEDIU, com a versão do
 * termo e a hora que ele aceitou: a coordenação não consente por ninguém.
 */
@Injectable()
export class VinculoResponsavelService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
  ) {}

  async listarPendentes(usuarioId: string): Promise<ListaVinculosPendentes> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    const linhas = await this.db
      .select({
        id: solicitacao.id,
        criadoEm: solicitacao.criadoEm,
        emailDaConta: solicitacao.emailConta,
        contatoId: responsavelAluno.id,
        contatoNome: responsavelAluno.nome,
        parentesco: responsavelAluno.parentesco,
        emailCadastrado: responsavelAluno.email,
        alunoNome: alunoInstituicao.nome,
      })
      .from(solicitacao)
      .innerJoin(
        responsavelAluno,
        and(
          eq(responsavelAluno.id, solicitacao.responsavelAlunoId),
          eq(responsavelAluno.instituicaoId, solicitacao.instituicaoId),
        ),
      )
      .innerJoin(
        alunoInstituicao,
        and(
          eq(alunoInstituicao.id, responsavelAluno.alunoInstituicaoId),
          eq(alunoInstituicao.instituicaoId, responsavelAluno.instituicaoId),
        ),
      )
      .where(and(eq(solicitacao.instituicaoId, instituicaoId), eq(solicitacao.status, 'pendente_aprovacao')))
      .orderBy(asc(solicitacao.criadoEm));
    return {
      itens: linhas.map((l) => ({
        id: l.id,
        criadoEm: l.criadoEm.toISOString(),
        emailDaConta: l.emailDaConta,
        contato: {
          id: l.contatoId,
          nome: l.contatoNome,
          parentesco: l.parentesco,
          emailCadastrado: l.emailCadastrado,
        },
        aluno: { nome: l.alunoNome },
      })),
    };
  }

  async aprovar(usuarioId: string, papel: string, solicitacaoId: string): Promise<VinculoDecidido> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.db.transaction(async (tx) => {
      // Trava a linha: duas decisões ao mesmo tempo se enfileiram, e a segunda não acha pendência.
      const [s] = await tx
        .select({
          id: solicitacao.id,
          responsavelAlunoId: solicitacao.responsavelAlunoId,
          conviteId: solicitacao.conviteId,
          solicitanteId: solicitacao.usuarioId,
          versaoTermo: solicitacao.versaoTermo,
          criadoEm: solicitacao.criadoEm,
        })
        .from(solicitacao)
        .where(
          and(
            eq(solicitacao.id, solicitacaoId),
            eq(solicitacao.instituicaoId, instituicaoId),
            eq(solicitacao.status, 'pendente_aprovacao'),
          ),
        )
        .limit(1)
        .for('update');
      if (!s) naoEncontrado();

      const [quem] = await tx
        .select({ tipoPerfil: usuario.tipoPerfil, status: usuario.status })
        .from(usuario)
        .where(eq(usuario.id, s.solicitanteId))
        .limit(1);
      if (quem?.tipoPerfil !== 'responsavel' || quem.status !== 'ativo') {
        throw new ConflictException({
          error: {
            code: 'SOLICITANTE_INDISPONIVEL',
            message: 'A conta que pediu o vínculo não está mais ativa como responsável.',
          },
        });
      }

      const [ligado] = await tx
        .update(responsavelAluno)
        .set({ usuarioId: s.solicitanteId, atualizadoEm: new Date() })
        .where(
          and(
            eq(responsavelAluno.id, s.responsavelAlunoId),
            eq(responsavelAluno.instituicaoId, instituicaoId),
            isNull(responsavelAluno.usuarioId),
          ),
        )
        .returning({ id: responsavelAluno.id });
      if (!ligado) {
        throw new ConflictException({
          error: { code: 'CONTATO_JA_VINCULADO', message: 'Este responsável já está ligado a uma conta.' },
        });
      }

      await tx.insert(consentimentoResponsavel).values({
        instituicaoId,
        responsavelAlunoId: s.responsavelAlunoId,
        usuarioId: s.solicitanteId,
        conviteId: s.conviteId,
        versaoTermo: s.versaoTermo,
        aceitoEm: s.criadoEm,
      });
      await tx
        .update(solicitacao)
        .set({ status: 'aprovada', decididoPor: usuarioId, decididoEm: new Date(), emailConta: null })
        .where(eq(solicitacao.id, s.id));
      await registrarAuditoria(tx, {
        instituicaoId,
        atorId: usuarioId,
        papel,
        acao: 'responsavel.vinculo_aprovado',
        entidade: 'responsavel_aluno',
        entidadeId: s.responsavelAlunoId,
        dados: { solicitacaoId: s.id, responsavelAlunoId: s.responsavelAlunoId },
      });
    });
    return { status: 'aprovada' };
  }

  async recusar(usuarioId: string, papel: string, solicitacaoId: string): Promise<VinculoDecidido> {
    const { instituicaoId } = await this.escopo.funcaoNaInstituicao(usuarioId);
    await this.db.transaction(async (tx) => {
      // UPDATE condicional: só decide quem acha a pendência, e uma vez.
      const [s] = await tx
        .update(solicitacao)
        .set({ status: 'recusada', decididoPor: usuarioId, decididoEm: new Date(), emailConta: null })
        .where(
          and(
            eq(solicitacao.id, solicitacaoId),
            eq(solicitacao.instituicaoId, instituicaoId),
            eq(solicitacao.status, 'pendente_aprovacao'),
          ),
        )
        .returning({ id: solicitacao.id, responsavelAlunoId: solicitacao.responsavelAlunoId });
      if (!s) naoEncontrado();
      await registrarAuditoria(tx, {
        instituicaoId,
        atorId: usuarioId,
        papel,
        acao: 'responsavel.vinculo_recusado',
        entidade: 'responsavel_aluno',
        entidadeId: s.responsavelAlunoId,
        dados: { solicitacaoId: s.id, responsavelAlunoId: s.responsavelAlunoId },
      });
    });
    return { status: 'recusada' };
  }
}
