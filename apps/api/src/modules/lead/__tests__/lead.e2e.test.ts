import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { LeadRepositoryMemory } from '../lead.repository.memory';
import { LEAD_REPOSITORY } from '../lead.tokens';

// O .env do repositório aponta para o banco de produção; este teste só usa o double em memória
// e fixa um host inexistente para qualquer acesso acidental falhar alto (ver app.e2e.test.ts).
process.env.DATABASE_URL = 'postgresql://teste:teste@127.0.0.1:1/banco-inexistente';
process.env.SUPABASE_JWT_SECRET = 'segredo-e2e-de-teste-com-pelo-menos-32-bytes';
process.env.SUPABASE_URL = 'https://projeto-de-teste.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste'; // só para o AuthModule subir; nenhuma chamada sai
process.env.LEAD_HASH_SALT = 'sal-de-teste';
process.env.LEAD_LIMITE_POR_HORA = '3';

const demo = {
  origem: 'demo',
  nome: 'Marina Souza',
  instituicao: 'Colégio Exemplo',
  email: 'marina.souza@colegioexemplo.test',
  consentimento: true,
  versaoPolitica: 'rascunho-2026-10',
  website: '',
};

describe('POST /leads', () => {
  let app: NestFastifyApplication;
  const repo = new LeadRepositoryMemory();
  let logs: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LEAD_REPOSITORY)
      .useValue(repo)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repo.leads.length = 0;
    repo.falharAoRegistrar = false;
    repo.falharNoContador = false;
    logs = [];
    for (const nivel of ['log', 'warn', 'error'] as const) {
      vi.spyOn(Logger.prototype, nivel).mockImplementation((...args: unknown[]) => void logs.push(String(args[0])));
    }
  });

  afterEach(() => vi.restoreAllMocks());

  const enviar = (corpo: unknown, ip = '203.0.113.10') =>
    supertest(app.getHttpAdapter().getInstance().server).post('/leads').set('x-vercel-forwarded-for', ip).send(corpo as object);

  it('é público: 202 sem token e grava o lead', async () => {
    const res = await enviar(demo);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true });
    expect(repo.leads).toEqual([
      expect.objectContaining({ origem: 'demo', email: demo.email, organizacao: 'Colégio Exemplo', perfil: null }),
    ]);
  });

  it('recusa payload inválido com 400 e sem gravar', async () => {
    const res = await enviar({ ...demo, nome: '', email: 'sem-arroba', consentimento: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    // O filtro global devolve só código e mensagem; as mensagens por campo vêm da validação do navegador.
    expect(JSON.stringify(res.body)).not.toContain('sem-arroba');
    expect(repo.leads).toHaveLength(0);
  });

  it('isca preenchida: responde 202 igual, não grava e não conta no limite', async () => {
    for (let i = 0; i < 6; i++) {
      const res = await enviar({ ...demo, website: 'http://spam.test' }, '203.0.113.20');
      expect(res.status).toBe(202);
    }
    expect(repo.leads).toHaveLength(0);
    expect((await enviar(demo, '203.0.113.20')).status).toBe(202);
  });

  it('e-mail repetido na mesma origem responde 202 igual, sem duplicar', async () => {
    expect((await enviar(demo)).status).toBe(202);
    const segunda = await enviar(demo);
    expect(segunda.status).toBe(202);
    expect(segunda.body).toEqual({ ok: true });
    expect(repo.leads).toHaveLength(1);
  });

  it('limita os envios por origem de rede e libera outra origem', async () => {
    const ip = '203.0.113.30';
    for (let i = 0; i < 3; i++) expect((await enviar({ ...demo, email: `a${i}@x.test` }, ip)).status).toBe(202);
    const barrado = await enviar({ ...demo, email: 'a9@x.test' }, ip);
    expect(barrado.status).toBe(429);
    expect(barrado.body.error.code).toBe('RATE_LIMITED');
    expect((await enviar({ ...demo, email: 'b@x.test' }, '203.0.113.31')).status).toBe(202);
  });

  it('contador fora do ar: o formulário continua funcionando (fail-open)', async () => {
    repo.falharNoContador = true;
    expect((await enviar(demo, '203.0.113.40')).status).toBe(202);
    expect(repo.leads).toHaveLength(1);
  });

  it('banco fora do ar: 503 com mensagem genérica', async () => {
    repo.falharAoRegistrar = true;
    const res = await enviar(demo, '203.0.113.50');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LEAD_INDISPONIVEL');
    expect(JSON.stringify(res.body)).not.toContain(demo.email);
  });

  it('nenhum dado pessoal vai para o log, nem no sucesso nem na falha', async () => {
    await enviar(demo, '203.0.113.60');
    await enviar({ ...demo, website: 'x' }, '203.0.113.61');
    repo.falharAoRegistrar = true;
    await enviar({ ...demo, email: 'outra.pessoa@x.test' }, '203.0.113.62');
    const todo = logs.join('\n');
    expect(todo).toMatch(/origem=demo/);
    for (const dado of ['Marina', 'marina.souza', 'colegioexemplo', 'Colégio Exemplo', 'outra.pessoa', '203.0.113']) {
      expect(todo).not.toContain(dado);
    }
  });
});
