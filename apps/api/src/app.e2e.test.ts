import 'reflect-metadata';
import 'dotenv/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { AUTH_ADMIN, USUARIO_REPOSITORY } from './modules/auth/auth.tokens';
import { AuthAdminMemory, UsuarioRepositoryMemory } from './modules/auth/auth.repository.memory';

// e2e real: app Nest+Fastify de verdade, sem mocks de Guard — prova que
// AuthGuard + RolesGuard (passo 6) e verifySupabaseJwt/hasRole (passo 5)
// funcionam juntos no pipeline HTTP completo. USUARIO_REPOSITORY/AUTH_ADMIN
// são overridados por doubles em memória (mesmo padrão dos outros módulos) —
// este arquivo testa Guards/RBAC, não a integração real com Supabase Auth.

const SECRET = 'segredo-e2e-de-teste-com-pelo-menos-32-bytes';
process.env.SUPABASE_JWT_SECRET = SECRET;

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
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

/** Token "de bootstrap" — sem app_metadata, como o de um supabase.auth.signUp() recém-criado. */
async function signBootstrapToken(sub: string, email: string) {
  const secretKey = new TextEncoder().encode(SECRET);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub, email, iat: now })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

describe('API e2e — Guards de auth/RBAC (passo 6, doc 03 §4)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(USUARIO_REPOSITORY)
      .useClass(UsuarioRepositoryMemory)
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

  it('GET /me com token válido — 200, dados derivados do JWT (doc 05 §2: "todos")', async () => {
    const token = await signToken('estudante');
    const res = await http().get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tipoPerfil).toBe('estudante');
    expect(res.body.id).toBe('22222222-2222-2222-2222-222222222222');
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

  it('GET /escola/overview com papel professor — 403 (só gestor)', async () => {
    const token = await signToken('professor');
    const res = await http().get('/escola/overview').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /escola/turmas/:id/desempenho aceita gestor E professor', async () => {
    const tokenGestor = await signToken('gestor');
    const tokenProfessor = await signToken('professor', '33333333-3333-3333-3333-333333333333');
    const resGestor = await http()
      .get('/escola/turmas/abc/desempenho')
      .set('Authorization', `Bearer ${tokenGestor}`);
    const resProfessor = await http()
      .get('/escola/turmas/abc/desempenho')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(resGestor.status).toBe(200);
    expect(resProfessor.status).toBe(200);
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
      .send({ nome: 'Professor Teste', email: 'prof@example.com', tipoPerfil: 'professor' });

    const segunda = await http()
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Professor Teste', email: 'prof@example.com', tipoPerfil: 'estudante' }); // tenta escalar — ignorado
    expect(segunda.status).toBe(201);
    expect(segunda.body).toEqual({ id: authUid, tipoPerfil: 'professor' });
  });

  it('POST /auth/register rejeita tipoPerfil=admin (A2 — não está em TipoPerfilPublicoSchema)', async () => {
    const res = await http()
      .post('/auth/register')
      .send({ nome: 'Tentativa', email: 'tentativa@example.com', tipoPerfil: 'admin' });
    expect(res.status).toBe(400);
  });
});
