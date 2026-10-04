import { Body, Controller, Get, HttpCode, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  RegistrarProfessorRequestSchema,
  type PreviaConviteProfessor,
  type RegistrarProfessorRequest,
} from '@notaa/contracts';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from '../auth/auth.service';
import { verifySupabaseJwtBootstrap } from '../auth/verify-jwt';
import { ProfessoresService } from './professores.service';

/**
 * Fluxo público do convite de professor institucional.
 *
 * É público porque roda ANTES de a conta existir: quem abre o link ainda não
 * tem login. O que autoriza é o token do convite, não o papel de quem chama —
 * e é por isso que papel e instituição nunca vêm do corpo da requisição.
 */
@Controller('convite-professor')
@Public()
export class ConviteProfessorController {
  constructor(
    private readonly professores: ProfessoresService,
    private readonly auth: AuthService,
  ) {}

  /** Prévia: só o nome da instituição que convidou. */
  @Get(':token')
  previa(@Param('token') token: string): Promise<PreviaConviteProfessor> {
    return this.professores.previaConvite(token);
  }

  /**
   * Cria a conta do professor institucional e queima o convite.
   *
   * Mesmo bootstrap de `POST /auth/register`: o cliente chama
   * `supabase.auth.signUp()` primeiro e manda aqui o access_token recém-criado,
   * que ainda não tem `app_metadata.papel` — este endpoint é quem o escreve.
   */
  @Post('registrar')
  @HttpCode(201)
  async registrar(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(RegistrarProfessorRequestSchema)) body: RegistrarProfessorRequest,
  ) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Token de autenticação ausente.' },
      });
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET não configurado no ambiente da API.');
    }

    let authUid: string;
    try {
      const claims = await verifySupabaseJwtBootstrap(authHeader.slice('Bearer '.length), secret);
      authUid = claims.sub;
    } catch {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Token inválido ou expirado.' },
      });
    }

    // Valida o convite ANTES de criar a conta: convite ruim não deve deixar
    // usuário órfão no banco.
    const convite = await this.professores.buscarConviteUsavel(body.token);

    const resultado = await this.auth.registrarProfessorInstitucional(authUid, {
      nome: body.nome,
      email: body.email,
      instituicaoId: convite.instituicaoId,
    });

    // Só queima o convite quando ele de fato criou a conta. Se a conta já
    // existia, o convite segue aberto para a pessoa certa usar.
    if (resultado.created) {
      await this.professores.marcarConviteUsado(convite.id, resultado.id);
    }

    return { id: resultado.id, tipoPerfil: resultado.tipoPerfil };
  }
}
