import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  EmailJaCadastradoError,
  type AuthAdminPort,
  type InstituicaoRepositoryPort,
  type Papel,
  type RegisterRequest,
  type UsuarioRepositoryPort,
} from '@notaa/contracts';
import { AUTH_ADMIN, INSTITUICAO_REPOSITORY, USUARIO_REPOSITORY } from './auth.tokens';

const MSG_EMAIL_CONFLITANTE =
  'Este e-mail já está cadastrado com outro método de login. Faça login com o método original (senha ou o provedor usado no primeiro cadastro).';

/**
 * `TipoPerfilPublico` (formulário de cadastro: estudante/professor/instituicao)
 * → `Papel` (usuario.tipo_perfil, doc 04 §2 — sem valor "instituicao"; quem se
 * cadastra representando uma instituição é a pessoa que a ADMINISTRA). A
 * entidade `instituicao` em si é criada logo em seguida, por
 * `criarInstituicaoDoAdmin()`.
 */
function paraPapel(tipoPerfilPublico: RegisterRequest['tipoPerfil']): Papel {
  return tipoPerfilPublico === 'instituicao' ? 'admin_instituicao' : tipoPerfilPublico;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(INSTITUICAO_REPOSITORY) private readonly instituicoes: InstituicaoRepositoryPort,
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
    const criado = await this.criarUsuarioIdempotente(authUid, {
      tipoPerfil: papel,
      nome: body.nome,
      email: body.email,
    });
    if (!criado.created) {
      // Corrida: outra chamada concorrente (mesmo auth_uid) já criou o usuário
      // — mesma regra de idempotência do `existente` acima: NÃO reescreve o papel.
      return criado.usuario;
    }

    const instituicaoId = await this.criarInstituicaoDoAdmin(authUid, papel, body.nomeInstituicao);
    await this.authAdmin.setPapel(authUid, papel, instituicaoId);
    return { id: authUid, tipoPerfil: papel };
  }

  /**
   * Cria a conta de um professor institucional, JÁ vinculada à instituição.
   *
   * Este caminho existe separado do `register` por uma razão de segurança: aqui
   * o papel e a instituição NÃO vêm do corpo da requisição, vêm de quem chama,
   * que só invoca este método depois de validar um convite. Se
   * `professor_institucional` estivesse no formulário público, qualquer pessoa
   * se declararia professor de qualquer instituição.
   *
   * Idempotente igual ao `register`: se a conta já existe, devolve a existente
   * sem reescrever papel nem instituição.
   */
  async registrarProfessorInstitucional(
    authUid: string,
    input: { nome: string; email: string; instituicaoId: string },
  ): Promise<{ id: string; tipoPerfil: Papel; created: boolean }> {
    const existente = await this.usuarios.findByAuthUid(authUid);
    if (existente) {
      return { id: existente.id, tipoPerfil: existente.tipoPerfil, created: false };
    }

    const papel: Papel = 'professor_institucional';
    const criado = await this.criarUsuarioIdempotente(authUid, {
      tipoPerfil: papel,
      nome: input.nome,
      email: input.email,
      instituicaoId: input.instituicaoId,
    });
    if (!criado.created) {
      return { id: criado.usuario.id, tipoPerfil: criado.usuario.tipoPerfil, created: false };
    }

    await this.authAdmin.setPapel(authUid, papel, input.instituicaoId);
    this.logger.log(
      `Professor institucional ${authUid} criado e vinculado à instituição ${input.instituicaoId}.`,
    );
    return { id: authUid, tipoPerfil: papel, created: true };
  }

  /**
   * Cria a instituição de quem se cadastrou representando uma e devolve o id para o
   * claim `app_metadata.instituicao_id` (lido por GET /me). Só roda no primeiro
   * registro deste auth_uid — o caminho idempotente retorna antes, então um
   * segundo POST /auth/register nunca cria uma instituição duplicada.
   *
   * Uma falha aqui NÃO derruba o cadastro: o usuário já existe e está
   * autenticado, e perder a conta inteira por causa da instituição seria pior
   * do que ficar sem ela. O admin cai no mesmo estado de antes desta correção
   * (`instituicao_id = null`), com o erro registrado no log para reprocessamento.
   */
  private async criarInstituicaoDoAdmin(
    authUid: string,
    papel: Papel,
    nomeInstituicao: string | undefined,
  ): Promise<string | null> {
    if (papel !== 'admin_instituicao' || !nomeInstituicao) {
      return null;
    }

    try {
      const criada = await this.instituicoes.criarParaAdmin({ nome: nomeInstituicao, adminId: authUid });
      this.logger.log(`Instituição "${criada.nome}" (${criada.id}) criada para o admin ${authUid}.`);
      return criada.id;
    } catch (err) {
      this.logger.error(
        `Usuário ${authUid} registrado como admin de instituição, mas a instituição "${nomeInstituicao}" não pôde ser criada.`,
        err instanceof Error ? err.stack : String(err),
      );
      return null;
    }
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
    const criado = await this.criarUsuarioIdempotente(authUid, { tipoPerfil: papel, nome, email });
    if (!criado.created) {
      // Corrida: onAuthStateChange do frontend pode disparar SIGNED_IN mais de
      // uma vez para o mesmo login (comportamento conhecido do supabase-js),
      // gerando duas chamadas concorrentes a /auth/sync-oauth com o MESMO
      // auth_uid. A perdedora da corrida cai aqui em vez de estourar 500.
      return { id: criado.usuario.id, tipoPerfil: criado.usuario.tipoPerfil, created: false };
    }

    await this.authAdmin.setPapel(authUid, papel, null);
    return { id: authUid, tipoPerfil: papel, created: true };
  }

  /**
   * Cria `usuario` tolerando a corrida de duas chamadas concorrentes para o
   * MESMO auth_uid (ex.: onAuthStateChange disparando SIGNED_IN em duplicidade).
   * Se o INSERT colide por unicidade:
   *   - re-consulta por auth_uid: se achar, foi a corrida consigo mesma — a
   *     outra chamada venceu, devolve o registro dela (idempotente);
   *   - se NÃO achar, o e-mail pertence a OUTRO auth_uid (ex.: conta criada por
   *     senha e depois login OAuth com o mesmo e-mail, sem linkagem no
   *     Supabase) — não há como prosseguir (não existe `usuario.id` para este
   *     auth_uid), devolve 409 claro em vez de deixar o erro cru do Postgres
   *     vazar como 500.
   */
  private async criarUsuarioIdempotente(
    authUid: string,
    input: { tipoPerfil: Papel; nome: string; email: string; instituicaoId?: string | null },
  ): Promise<
    | { created: true }
    | { created: false; usuario: { id: string; tipoPerfil: Papel } }
  > {
    try {
      await this.usuarios.create({ id: authUid, authUid, ...input });
      return { created: true };
    } catch (err) {
      if (!(err instanceof EmailJaCadastradoError)) {
        throw err;
      }
      const jaExiste = await this.usuarios.findByAuthUid(authUid);
      if (jaExiste) {
        return { created: false, usuario: jaExiste };
      }
      this.logger.warn(
        `Conflito de e-mail no cadastro: ${input.email} já pertence a outro auth_uid (tentativa: ${authUid}).`,
      );
      throw new ConflictException({ error: { code: 'CONFLICT', message: MSG_EMAIL_CONFLITANTE } });
    }
  }
}
