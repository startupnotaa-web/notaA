import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ConviteProfessor,
  PreviaConviteProfessor,
  ProfessorDaInstituicao,
  RemoverProfessorResponse,
} from '@notaa/contracts';
import {
  Database,
  and,
  asc,
  conviteProfessor,
  count,
  eq,
  inArray,
  instituicao,
  isNull,
  professorTurma,
  turma,
  usuario,
} from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import {
  calcularExpiracaoConviteProfessor,
  conviteProfessorValido,
} from '../escopo/escopo.regras';
import { EscopoService } from '../escopo/escopo.service';

/**
 * Token do convite: 32 bytes aleatórios em base64 para URL. É uma credencial de
 * acesso institucional, então nada de código curto nem de gerador previsível —
 * ao contrário do código de turma, este nunca é ditado em voz alta, é clicado.
 */
function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

function conviteInvalido(): never {
  // Mesma recusa para inexistente, expirado, usado e revogado: quem abre o link
  // não precisa da distinção, e ela ajudaria a sondar tokens.
  throw new NotFoundException({
    error: {
      code: 'CONVITE_INVALIDO',
      message: 'Este convite é inválido, já foi usado ou expirou. Peça um novo à instituição.',
    },
  });
}

@Injectable()
export class ProfessoresService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly escopo: EscopoService,
  ) {}

  // ─── Convites ─────────────────────────────────────────────────────────────

  /** Gera um convite. Quem chama monta o link com este token e o entrega. */
  async criarConvite(adminId: string, email?: string): Promise<ConviteProfessor> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(adminId);
    const agora = new Date();

    const [criado] = await this.db
      .insert(conviteProfessor)
      .values({
        instituicaoId,
        token: gerarToken(),
        email: email ?? null,
        criadoPor: adminId,
        expiraEm: calcularExpiracaoConviteProfessor(agora),
      })
      .returning({
        id: conviteProfessor.id,
        token: conviteProfessor.token,
        email: conviteProfessor.email,
        expiraEm: conviteProfessor.expiraEm,
        criadoEm: conviteProfessor.criadoEm,
      });

    return {
      id: criado!.id,
      token: criado!.token,
      email: criado!.email ?? null,
      expiraEm: criado!.expiraEm.toISOString(),
      criadoEm: criado!.criadoEm.toISOString(),
    };
  }

  /** Convites em aberto: não usados, não revogados e dentro do prazo. */
  async listarConvites(adminId: string): Promise<ConviteProfessor[]> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(adminId);
    const agora = new Date();

    const linhas = await this.db
      .select({
        id: conviteProfessor.id,
        token: conviteProfessor.token,
        email: conviteProfessor.email,
        expiraEm: conviteProfessor.expiraEm,
        usadoEm: conviteProfessor.usadoEm,
        revogadoEm: conviteProfessor.revogadoEm,
        criadoEm: conviteProfessor.criadoEm,
      })
      .from(conviteProfessor)
      .where(
        and(
          eq(conviteProfessor.instituicaoId, instituicaoId),
          isNull(conviteProfessor.usadoEm),
          isNull(conviteProfessor.revogadoEm),
        ),
      )
      .orderBy(asc(conviteProfessor.criadoEm));

    // O prazo é filtrado aqui, pela mesma função que o fluxo de uso aplica —
    // assim "aberto" significa a mesma coisa nos dois lugares.
    return linhas
      .filter((l) => conviteProfessorValido(l, agora))
      .map((l) => ({
        id: l.id,
        token: l.token,
        email: l.email ?? null,
        expiraEm: l.expiraEm.toISOString(),
        criadoEm: l.criadoEm.toISOString(),
      }));
  }

  /** Revoga um convite ainda não usado. */
  async revogarConvite(adminId: string, conviteId: string): Promise<void> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(adminId);

    const revogados = await this.db
      .update(conviteProfessor)
      .set({ revogadoEm: new Date() })
      .where(
        and(
          eq(conviteProfessor.id, conviteId),
          eq(conviteProfessor.instituicaoId, instituicaoId),
          isNull(conviteProfessor.usadoEm),
          isNull(conviteProfessor.revogadoEm),
        ),
      )
      .returning({ id: conviteProfessor.id });

    if (revogados.length === 0) conviteInvalido();
  }

  /**
   * Prévia pública do convite: só o nome da instituição. Roda antes de a conta
   * existir, então não pode exigir autenticação nem revelar mais que isso.
   */
  async previaConvite(token: string): Promise<PreviaConviteProfessor> {
    const linha = await this.buscarConviteUsavel(token);
    const [inst] = await this.db
      .select({ nome: instituicao.nome })
      .from(instituicao)
      .where(eq(instituicao.id, linha.instituicaoId))
      .limit(1);

    if (!inst) conviteInvalido();
    return { instituicaoNome: inst.nome, email: linha.email ?? null };
  }

  /** Dados do convite para o fluxo de registro consumir. */
  async buscarConviteUsavel(token: string): Promise<{
    id: string;
    instituicaoId: string;
    email: string | null;
  }> {
    const [linha] = await this.db
      .select({
        id: conviteProfessor.id,
        instituicaoId: conviteProfessor.instituicaoId,
        email: conviteProfessor.email,
        expiraEm: conviteProfessor.expiraEm,
        usadoEm: conviteProfessor.usadoEm,
        revogadoEm: conviteProfessor.revogadoEm,
      })
      .from(conviteProfessor)
      .where(eq(conviteProfessor.token, token))
      .limit(1);

    if (!linha || !conviteProfessorValido(linha, new Date())) conviteInvalido();
    return { id: linha.id, instituicaoId: linha.instituicaoId, email: linha.email ?? null };
  }

  /** Queima o convite. Chamado pelo registro, depois de criar a conta. */
  async marcarConviteUsado(conviteId: string, professorId: string): Promise<void> {
    await this.db
      .update(conviteProfessor)
      .set({ usadoEm: new Date(), usadoPor: professorId })
      .where(and(eq(conviteProfessor.id, conviteId), isNull(conviteProfessor.usadoEm)));
  }

  // ─── Professores ──────────────────────────────────────────────────────────

  /**
   * Professores da instituição, com quantas turmas cada um tem e — o que importa
   * para a remoção — em quais ele é o único professor.
   *
   * perfis.md: ao remover um professor, avisar se alguma turma ficaria sem
   * professor. Esta lista já entrega o aviso pronto, para a tela não precisar
   * descobrir sozinha.
   */
  async listar(adminId: string): Promise<ProfessorDaInstituicao[]> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(adminId);

    const professores = await this.db
      .select({ professorId: usuario.id, nome: usuario.nome, email: usuario.email })
      .from(usuario)
      .where(
        and(
          eq(usuario.instituicaoId, instituicaoId),
          eq(usuario.tipoPerfil, 'professor_institucional'),
        ),
      )
      .orderBy(asc(usuario.nome));

    if (professores.length === 0) return [];

    const ids = professores.map((p) => p.professorId);

    const vinculos = await this.db
      .select({ professorId: professorTurma.professorId, turmaId: turma.id, turmaNome: turma.nome })
      .from(professorTurma)
      .innerJoin(turma, eq(turma.id, professorTurma.turmaId))
      .where(and(inArray(professorTurma.professorId, ids), eq(turma.arquivada, false)));

    const turmaIds = [...new Set(vinculos.map((v) => v.turmaId))];
    const totalPorTurma = new Map<string, number>();
    if (turmaIds.length > 0) {
      const contagens = await this.db
        .select({ turmaId: professorTurma.turmaId, total: count() })
        .from(professorTurma)
        .where(inArray(professorTurma.turmaId, turmaIds))
        .groupBy(professorTurma.turmaId);
      for (const c of contagens) totalPorTurma.set(c.turmaId, Number(c.total));
    }

    return professores.map((p) => {
      const minhas = vinculos.filter((v) => v.professorId === p.professorId);
      return {
        professorId: p.professorId,
        nome: p.nome,
        email: p.email,
        quantidadeDeTurmas: minhas.length,
        turmasQueFicariamSemProfessor: minhas
          .filter((v) => (totalPorTurma.get(v.turmaId) ?? 0) <= 1)
          .map((v) => ({ id: v.turmaId, nome: v.turmaNome })),
      };
    });
  }

  /**
   * Remove o professor da instituição.
   *
   * Recusa se alguma turma ativa ficaria sem professor (perfis.md exige o aviso;
   * aqui o servidor vai além e bloqueia, porque o front não é autorização). As
   * saídas são vincular outro professor ou arquivar a turma.
   *
   * Remover tira o vínculo institucional e os vínculos de turma. A CONTA do
   * professor não é apagada — mesma regra que vale para aluno.
   */
  async remover(adminId: string, professorId: string): Promise<RemoverProfessorResponse> {
    const instituicaoId = await this.escopo.instituicaoDoUsuario(adminId);
    const lista = await this.listar(adminId);
    const alvo = lista.find((p) => p.professorId === professorId);

    if (!alvo) {
      throw new NotFoundException({
        error: {
          code: 'PROFESSOR_NAO_ENCONTRADO',
          message: 'Professor não encontrado nesta instituição.',
        },
      });
    }

    if (alvo.turmasQueFicariamSemProfessor.length > 0) {
      const nomes = alvo.turmasQueFicariamSemProfessor.map((t) => t.nome).join(', ');
      throw new ConflictException({
        error: {
          code: 'TURMA_FICARIA_SEM_PROFESSOR',
          message: `Estas turmas ficariam sem professor: ${nomes}. Vincule outro professor a elas, ou arquive-as, antes de remover.`,
        },
      });
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(professorTurma).where(eq(professorTurma.professorId, professorId));
      await tx
        .update(usuario)
        .set({ instituicaoId: null, atualizadoEm: new Date() })
        .where(and(eq(usuario.id, professorId), eq(usuario.instituicaoId, instituicaoId)));
    });

    return { removido: true };
  }
}
