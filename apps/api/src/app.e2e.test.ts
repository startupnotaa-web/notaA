import 'reflect-metadata';
import 'dotenv/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { AUTH_ADMIN, INSTITUICAO_REPOSITORY, USUARIO_REPOSITORY } from './modules/auth/auth.tokens';
import {
  AuthAdminMemory,
  InstituicaoRepositoryMemory,
  UsuarioRepositoryMemory,
} from './modules/auth/auth.repository.memory';

// e2e real: app Nest+Fastify de verdade, sem mocks de Guard — prova que
// AuthGuard + RolesGuard (passo 6) e verifySupabaseJwt/hasRole (passo 5)
// funcionam juntos no pipeline HTTP completo. USUARIO_REPOSITORY/AUTH_ADMIN
// são overridados por doubles em memória (mesmo padrão dos outros módulos) —
// este arquivo testa Guards/RBAC, não a integração real com Supabase Auth.

// ⚠️ O `dotenv/config` acima carrega o .env do repositório, cujo DATABASE_URL
// aponta para o banco de PRODUÇÃO. Sem esta linha, rodar `pnpm test` lê dados
// reais — e qualquer rota que escreva e não esteja overridada por um double de
// memória escreveria em produção. Apontar para um host inexistente faz qualquer
// acesso a banco falhar ALTO neste arquivo, em vez de silenciosamente tocar o
// ambiente real. Teste que precise de banco deve usar um double de memória
// (padrão deste repositório) ou um Postgres descartável.
process.env.DATABASE_URL = 'postgresql://teste:teste@127.0.0.1:1/banco-inexistente';

const SECRET = 'segredo-e2e-de-teste-com-pelo-menos-32-bytes';
process.env.SUPABASE_JWT_SECRET = SECRET;
// `verifySupabaseJwt` exige os claims `iss` e `aud` (jwtVerify recebe
// issuer/audience), como todo token real do Supabase Auth traz. Os helpers
// abaixo assinavam sem esses claims, então TODA requisição autenticada destes
// testes morria em 401 antes de chegar ao que o teste queria provar. SUPABASE_URL
// é fixado aqui, depois do dotenv, para o issuer não depender do .env da máquina.
const SUPABASE_URL = 'https://projeto-de-teste.supabase.co';
process.env.SUPABASE_URL = SUPABASE_URL;
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const AUDIENCE = 'authenticated';

async function signToken(papel: string, sub = '22222222-2222-2222-2222-222222222222') {
  const secretKey = new TextEncoder().encode(SECRET);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub,
    email: 'user@example.com',
    app_metadata: { papel },
    iat: now,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

/** Token "de bootstrap" — sem app_metadata, como o de um supabase.auth.signUp() recém-criado. */
async function signBootstrapToken(sub: string, email: string) {
  const secretKey = new TextEncoder().encode(SECRET);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub, email, iat: now })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

describe('API e2e — Guards de auth/RBAC (passo 6, doc 03 §4)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(USUARIO_REPOSITORY)
      .useClass(UsuarioRepositoryMemory)
      .overrideProvider(INSTITUICAO_REPOSITORY)
      .useClass(InstituicaoRepositoryMemory)
      .overrideProvider(AUTH_ADMIN)
      .useClass(AuthAdminMemory)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  function http() {
    return supertest(app.getHttpAdapter().getInstance().server);
  }

  it('GET /health é público — 200 sem token', async () => {
    const res = await http().get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /me sem token — 401 UNAUTHENTICATED (default-deny)', async () => {
    const res = await http().get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('UNAUTHENTICATED');
  });

  it('GET /me com token inválido — 401', async () => {
    const res = await http().get('/me').set('Authorization', 'Bearer token-forjado-invalido');
    expect(res.status).toBe(401);
  });

  /**
   * Token válido atravessa AuthGuard e RolesGuard. O corpo completo de GET /me
   * mistura claim do JWT com dado de banco (nome, perfil 4D, assinatura), então
   * só o 200 exige banco — e este arquivo não tem.
   *
   * Antes esta asserção era `toBe(200)` e passava porque o `.env` do repositório
   * apontava o teste para o banco de PRODUÇÃO. Era dependência silenciosa de
   * ambiente real, não cobertura. Verificar o corpo de /me é trabalho de um teste
   * de integração com banco descartável.
   */
  it('GET /me com token válido — passa dos guards (doc 05 §2: "todos")', async () => {
    const token = await signToken('estudante');
    const res = await http().get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('GET /admin/users com papel não-admin — 403 FORBIDDEN_ROLE', async () => {
    const token = await signToken('estudante');
    const res = await http().get('/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('FORBIDDEN_ROLE');
  });

  it('GET /admin/users com papel admin — 200', async () => {
    const token = await signToken('admin');
    const res = await http().get('/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('GET /instituicao/overview com papel professor — 403 (só admin de instituição)', async () => {
    const token = await signToken('professor_institucional');
    const res = await http().get('/instituicao/overview').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  // A rota de detalhe de turma resolve escopo no banco, que este arquivo não
  // tem. Dá para provar a barreira de PAPEL sem banco (abaixo); provar a de
  // ESCOPO exige banco e fica para um teste de integração próprio.

  it('GET /instituicao/turmas/:id/desempenho — 403 para estudante', async () => {
    const token = await signToken('estudante');
    const res = await http()
      .get('/instituicao/turmas/44444444-4444-4444-4444-44444444aaaa/desempenho')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /instituicao/alunos — 403 para professor institucional', async () => {
    const token = await signToken('professor_institucional');
    const res = await http().get('/instituicao/alunos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /auth/register valida o payload mesmo sem token (pipe roda antes do handler)', async () => {
    const res = await http().post('/auth/register').send({ nome: '', email: 'invalido' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/register sem Bearer (token de bootstrap do signUp) — 401', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ nome: 'Aluna Teste', email: 'aluna@example.com', tipoPerfil: 'estudante' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('UNAUTHENTICATED');
  });

  it('POST /auth/register com token de bootstrap válido cria usuario e seta app_metadata.papel (E1)', async () => {
    const authUid = '44444444-4444-4444-4444-444444444444';
    const token = await signBootstrapToken(authUid, 'aluna@example.com');
    const res = await http()
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Aluna Teste', email: 'aluna@example.com', tipoPerfil: 'estudante' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: authUid, tipoPerfil: 'estudante' });
  });

  it('POST /auth/register é idempotente — 2ª chamada com o mesmo auth_uid não muda o papel', async () => {
    const authUid = '55555555-5555-5555-5555-555555555555';
    const token = await signBootstrapToken(authUid, 'prof@example.com');
    await http()
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Professor Teste', email: 'prof@example.com', tipoPerfil: 'professor_independente' });

    const segunda = await http()
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Professor Teste', email: 'prof@example.com', tipoPerfil: 'estudante' }); // tenta escalar — ignorado
    expect(segunda.status).toBe(201);
    expect(segunda.body).toEqual({ id: authUid, tipoPerfil: 'professor_independente' });
  });

  it('POST /auth/register rejeita tipoPerfil=admin (A2 — não está em TipoPerfilPublicoSchema)', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ nome: 'Tentativa', email: 'tentativa@example.com', tipoPerfil: 'admin' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/register com tipoPerfil=instituicao exige nomeInstituicao', async () => {
    const authUid = '66666666-6666-6666-6666-666666666666';
    const token = await signBootstrapToken(authUid, 'admin-sem-nome@example.com');
    const res = await http()
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Admin Teste', email: 'admin-sem-nome@example.com', tipoPerfil: 'instituicao' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/register com tipoPerfil=instituicao cria a instituição e amarra o admin a ela', async () => {
    const authUid = '77777777-7777-7777-7777-777777777777';
    const token = await signBootstrapToken(authUid, 'admin@example.com');
    const res = await http()
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Admin Teste',
        email: 'admin@example.com',
        tipoPerfil: 'instituicao',
        nomeInstituicao: 'Colégio Nota A',
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: authUid, tipoPerfil: 'admin_instituicao' });

    const instituicoes = app.get<InstituicaoRepositoryMemory>(INSTITUICAO_REPOSITORY);
    expect(instituicoes.criadas).toEqual([
      { id: 'instituicao-1', nome: 'Colégio Nota A', adminId: authUid },
    ]);

    // O id da instituição vai para app_metadata.instituicao_id — é o que GET /me lê
    // para saber a qual instituição o admin pertence.
    const authAdmin = app.get<AuthAdminMemory>(AUTH_ADMIN);
    expect(authAdmin.chamadas).toContainEqual({
      authUid,
      papel: 'admin_instituicao',
      instituicaoId: 'instituicao-1',
    });
  });

  // Recusas de papel da estrutura de turmas. São checadas pelo RolesGuard, antes
  // do handler, então valem sem banco: provam a barreira, não a regra de negócio.
  it('POST /turma — 403 para estudante (aluno não cria turma)', async () => {
    const token = await signToken('estudante');
    const res = await http()
      .post('/turma')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Turma A', anoLetivoId: '11111111-1111-1111-1111-111111111111' });
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('FORBIDDEN_ROLE');
  });

  it('POST /turma — 403 para professor institucional (só leciona no que a instituição atribuir)', async () => {
    const token = await signToken('professor_institucional');
    const res = await http()
      .post('/turma')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Turma A', anoLetivoId: '11111111-1111-1111-1111-111111111111' });
    expect(res.status).toBe(403);
  });

  it('POST /turma/:id/professores — 403 para professor independente (vincular é ato da instituição)', async () => {
    const token = await signToken('professor_independente');
    const res = await http()
      .post('/turma/22222222-2222-2222-2222-222222222222/professores')
      .set('Authorization', `Bearer ${token}`)
      .send({ professorId: '33333333-3333-3333-3333-333333333333' });
    expect(res.status).toBe(403);
  });

  it('GET /me/turmas — 403 para admin de instituição (a rota é do aluno)', async () => {
    const token = await signToken('admin_instituicao');
    const res = await http().get('/me/turmas').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /ano-letivo — 403 para estudante', async () => {
    const token = await signToken('estudante');
    const res = await http()
      .post('/ano-letivo')
      .set('Authorization', `Bearer ${token}`)
      .send({ rotulo: '2026' });
    expect(res.status).toBe(403);
  });

  it('POST /me/turmas/convite exige consentimento explícito — 400 sem ele', async () => {
    const token = await signToken('estudante');
    const res = await http()
      .post('/me/turmas/convite')
      .set('Authorization', `Bearer ${token}`)
      .send({ codigo: 'ABC123' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /instituicao/professores — 403 para professor institucional (quem leciona não administra o quadro)', async () => {
    const token = await signToken('professor_institucional');
    const res = await http().get('/instituicao/professores').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /instituicao/professores/convites — 403 para professor independente', async () => {
    const token = await signToken('professor_independente');
    const res = await http()
      .post('/instituicao/professores/convites')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('GET /convite-professor/:token é público — atravessa os guards sem token', async () => {
    const res = await http().get('/convite-professor/token-que-nao-existe-com-tamanho-ok');
    // Este arquivo testa guards, não banco: aqui o handler é alcançado e falha
    // na consulta (não há banco no e2e). O que importa provar é que NÃO houve
    // barreira de autenticação nem de papel — numa rota não-pública a resposta
    // seria 401 antes de o handler rodar.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('POST /convite-professor/registrar valida o payload mesmo sem token de bootstrap', async () => {
    const res = await http().post('/convite-professor/registrar').send({ nome: '', email: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /convite-professor/registrar sem Bearer — 401', async () => {
    const res = await http()
      .post('/convite-professor/registrar')
      .send({ nome: 'Prof Teste', email: 'prof@example.com', token: 'x'.repeat(32) });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('UNAUTHENTICATED');
  });

  it('POST /battle/matchmake — 404 com a Arena oculta (FEATURE_ARENA desligada)', async () => {
    const token = await signToken('estudante');
    const res = await http()
      .post('/battle/matchmake')
      .set('Authorization', `Bearer ${token}`)
      .send({ area: 'matematica' });
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('POST /battle/finish — 404 com a Arena oculta (FEATURE_ARENA desligada)', async () => {
    const token = await signToken('estudante');
    const res = await http()
      .post('/battle/finish')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(404);
  });
});
