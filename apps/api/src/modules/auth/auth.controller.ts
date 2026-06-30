import { Body, Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  PasswordResetRequestSchema,
  RegisterRequestSchema,
  type PasswordResetRequest,
  type RegisterRequest,
} from '@notaa/contracts';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { verifySupabaseJwtBootstrap } from './verify-jwt';

// doc 05 §2 — Responsável/Admin NÃO se auto-cadastram (A2); RegisterRequestSchema
// já restringe tipoPerfil a estudante/professor/escola (TipoPerfilPublicoSchema).
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * @Public() pula o AuthGuard padrão (que exige app_metadata.papel — claim
   * que esta MESMA chamada é quem escreve pela 1ª vez). Em vez disso, este
   * handler verifica o Bearer manualmente via verifySupabaseJwtBootstrap
   * (assinatura + sub/email, sem papel) — ver doc no arquivo de contracts/jwt.ts.
   * O cliente chama supabase.auth.signUp() ANTES disto, e este endpoint espera
   * o access_token dessa sessão recém-criada no header Authorization.
   */
  @Public()
  @Post('register')
  @HttpCode(201)
  async register(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(RegisterRequestSchema)) body: RegisterRequest,
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

    const token = authHeader.slice('Bearer '.length);
    let authUid: string;
    try {
      authUid = (await verifySupabaseJwtBootstrap(token, secret)).sub;
    } catch {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Token inválido ou expirado.' },
      });
    }

    // Erros daqui (DB/Admin API) NÃO são 401 — propagam como falha real (500), não auth.
    return this.auth.register(authUid, body);
  }

  @Public()
  @Post('sync-oauth')
  @HttpCode(200)
  async syncOAuth(@Req() req: FastifyRequest) {
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

    const token = authHeader.slice('Bearer '.length);
    let authUid: string;
    let email: string;
    try {
      const claims = await verifySupabaseJwtBootstrap(token, secret);
      authUid = claims.sub;
      email = claims.email ?? '';
    } catch {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Token inválido ou expirado.' },
      });
    }

    if (!email) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'E-mail não encontrado no token OAuth.' },
      });
    }

    return this.auth.ensureOAuthUser(authUid, email);
  }

  @Public()
  @Post('password-reset')
  @HttpCode(200)
  passwordReset(
    @Body(new ZodValidationPipe(PasswordResetRequestSchema)) body: PasswordResetRequest,
  ) {
    // TODO (Fase 2): delegar ao Supabase Auth (doc 05 §2) — supabase.auth.resetPasswordForEmail
    // é chamado pelo PRÓPRIO cliente web; este endpoint hoje só valida o contrato.
    return { status: 'ok', email: body.email };
  }
}
