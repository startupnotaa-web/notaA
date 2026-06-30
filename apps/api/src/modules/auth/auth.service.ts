import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthAdminPort, Papel, RegisterRequest, UsuarioRepositoryPort } from '@notaa/contracts';
import { AUTH_ADMIN, USUARIO_REPOSITORY } from './auth.tokens';

/**
 * `TipoPerfilPublico` (formulário de cadastro: estudante/professor/escola) →
 * `Papel` (usuario.tipo_perfil, doc 04 §2 — sem valor "escola"; quem se
 * cadastra "como escola" é a pessoa GESTORA daquela escola). A entidade
 * `escola` em si (nome, rede) não é criada aqui — fora do escopo deste MVP
 * de registro; ficaria com `escolaId: null` até um fluxo próprio existir.
 */
function paraPapel(tipoPerfilPublico: RegisterRequest['tipoPerfil']): Papel {
  return tipoPerfilPublico === 'escola' ? 'gestor' : tipoPerfilPublico;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(AUTH_ADMIN) private readonly authAdmin: AuthAdminPort,
  ) {}

  /**
   * Cria `usuario` (id = auth_uid, decisão registrada no doc 09) e escreve
   * `app_metadata.papel` no Supabase Auth via Admin API — só a API faz essa
   * escrita (doc 03 §9). O cliente precisa renovar a sessão (refreshSession)
   * depois desta chamada para receber um JWT com o claim novo.
   * Idempotente: se já existe `usuario` para este auth_uid, retorna o
   * existente SEM permitir mudar o papel (não há re-registro que escale papel).
   */
  async register(authUid: string, body: RegisterRequest): Promise<{ id: string; tipoPerfil: Papel }> {
    const existente = await this.usuarios.findByAuthUid(authUid);
    if (existente) {
      return existente;
    }

    const papel = paraPapel(body.tipoPerfil);
    await this.usuarios.create({ id: authUid, authUid, tipoPerfil: papel, nome: body.nome, email: body.email });
    await this.authAdmin.setPapel(authUid, papel, null);

    return { id: authUid, tipoPerfil: papel };
  }

  /**
   * Sincronização OAuth — chamada por `POST /auth/sync-oauth` quando um
   * usuário faz login via provedor externo (Google, etc.) e não passou pelo
   * formulário de cadastro (sem user_metadata.tipoPerfil). Cria o registro
   * com papel padrão 'estudante' e escreve app_metadata.papel, exatamente
   * como register() faria — mas derivando os dados do JWT em vez do body.
   *
   * Idempotente: se o usuário já existe, apenas retorna o existente.
   */
  async ensureOAuthUser(
    authUid: string,
    email: string,
  ): Promise<{ id: string; tipoPerfil: Papel; created: boolean }> {
    const existente = await this.usuarios.findByAuthUid(authUid);
    if (existente) {
      return { id: existente.id, tipoPerfil: existente.tipoPerfil, created: false };
    }

    const papel: Papel = 'estudante'; // Default para OAuth — doc 05 §2
    const nome = email.split('@')[0] ?? 'Usuário'; // Placeholder até o onboarding
    this.logger.log(`Sync OAuth: criando usuario ${authUid} (${email}) como '${papel}'`);
    await this.usuarios.create({ id: authUid, authUid, tipoPerfil: papel, nome, email });
    await this.authAdmin.setPapel(authUid, papel, null);

    return { id: authUid, tipoPerfil: papel, created: true };
  }
}
