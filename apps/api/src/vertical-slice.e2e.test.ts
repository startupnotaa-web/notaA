import 'reflect-metadata';
import 'dotenv/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { GAMIFICACAO_REPOSITORY } from './modules/gamificacao/gamificacao.tokens';
import { GamificacaoRepositoryMemory } from './modules/gamificacao/gamificacao.repository.memory';
import { PROFILER_REPOSITORY } from './modules/profiler/profiler.tokens';
import { ProfilerRepositoryMemory } from './modules/profiler/profiler.repository.memory';
import { QUIZ_REPOSITORY } from './modules/quiz/quiz.tokens';
import { QuizRepositoryMemory } from './modules/quiz/__tests__/quiz.repository.memory';
import { DASHBOARD_REPOSITORY } from './modules/dashboard/dashboard.tokens';
import { DashboardRepositoryMemory } from './modules/dashboard/dashboard.repository.memory';
import { ERROR_DETECTOR_REPOSITORY } from './modules/error-detector/error-detector.tokens';
import { LLM_PROVIDER } from './modules/ai/ai.tokens';
import { ErrorDetectorRepositoryMemory } from './modules/error-detector/error-detector.repository.memory';

// e2e da fatia vertical E1→E2→E3→E4→E9 (passos 9 + Fase 1, doc 08 — valida
// estruturalmente a métrica norte): onboarding incremental → quiz adaptativo
// → TRI atualiza θ → XP/streak são lançados → perfil 4D é atualizado.
// Usa os adaptadores EM MEMÓRIA (onboarding/quiz/gamificacao/profiler) via
// override do Nest Testing Module — em produção os módulos usam os
// adaptadores Drizzle reais (@notaa/db); só a lógica de serviço/controller
// é exercitada aqui, isolada da infra (rápido, repetível, sem fixtures de DB).

const SECRET = 'segredo-vertical-slice-com-pelo-menos-32-bytes';
process.env.SUPABASE_JWT_SECRET = SECRET;

/**
 * Provedor de IA determinístico. O quiz é 100% gerado por IA, então sem este
 * override o e2e sairia para a rede a cada questão — lento, instável e
 * dependente de cota do Gemini. Devolve sempre a mesma questão, com a
 * alternativa de índice 1 correta (vira 'B' no serviço).
 */
class LLMProviderFake {
  async complete<T>(input: { schema: { parse: (v: unknown) => T } }): Promise<{ data: T; uso: unknown }> {
    return {
      data: input.schema.parse({
        enunciado: 'Questão determinística de teste.',
        alternativas: ['alternativa a', 'alternativa b', 'alternativa c', 'alternativa d', 'alternativa e'],
        correta: 1,
        explicacao: 'Explicação de teste.',
        dicaPerfil: 'Dica de teste.',
        dificuldade: 'Média',
      }),
      uso: { tokensIn: 0, tokensOut: 0, custoEstimado: 0, latenciaMs: 0 },
    };
  }

  async completeTexto() {
    return { texto: 'texto de teste', uso: { tokensIn: 0, tokensOut: 0, custoEstimado: 0, latenciaMs: 0 } };
  }
}

async function signToken(sub: string, papel = 'estudante') {
  const secretKey = new TextEncoder().encode(SECRET);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub, email: `${sub}@example.com`, app_metadata: { papel }, iat: now })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

describe('Fatia vertical E1→E2 — onboarding + quiz adaptativo (passo 9)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let errorDetectorRepo: ErrorDetectorRepositoryMemory;
  const ESTUDANTE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(QUIZ_REPOSITORY)
      .useClass(QuizRepositoryMemory)
      .overrideProvider(GAMIFICACAO_REPOSITORY)
      .useClass(GamificacaoRepositoryMemory)
      .overrideProvider(PROFILER_REPOSITORY)
      .useClass(ProfilerRepositoryMemory)
      .overrideProvider(DASHBOARD_REPOSITORY)
      .useClass(DashboardRepositoryMemory)
      .overrideProvider(ERROR_DETECTOR_REPOSITORY)
      .useClass(ErrorDetectorRepositoryMemory)
      .overrideProvider(LLM_PROVIDER)
      .useClass(LLMProviderFake)
      .compile();
    errorDetectorRepo = moduleRef.get(ERROR_DETECTOR_REPOSITORY);
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    token = await signToken(ESTUDANTE_ID);
  });

  afterAll(async () => {
    await app.close();
  });

  function http() {
    const server = app.getHttpAdapter().getInstance().server;
    const withAuth = (req: supertest.Test) => req.set('Authorization', `Bearer ${token}`);
    return {
      get: (path: string) => withAuth(supertest(server).get(path)),
      post: (path: string) => withAuth(supertest(server).post(path)),
      put: (path: string) => withAuth(supertest(server).put(path)),
    };
  }

  it('GET /onboarding/state inicia no passo 1, não concluído', async () => {
    const res = await http().get('/onboarding/state');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ passoAtual: 1, concluido: false });
  });

  it('PUT /onboarding/steps/:n salva incrementalmente (A6) e valida o payload', async () => {
    const invalido = await http().put('/onboarding/steps/2').send({ objetivoEnem: '' });
    expect(invalido.status).toBe(400);

    const passo2 = await http()
      .put('/onboarding/steps/2')
      .send({ objetivoEnem: 'medicina', notaAlvo: 800 });
    expect(passo2.status).toBe(200);
    expect(passo2.body).toEqual({ passoAtual: 2, proximoPasso: 3 });
  });

  it('POST /onboarding/complete falha se faltar passo obrigatório', async () => {
    const res = await http().post('/onboarding/complete');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('completa os 8 passos (7 opcional/pulado) e conclui o onboarding', async () => {
    await http().put('/onboarding/steps/1').send({ nome: 'Aluna Teste' });
    await http()
      .put('/onboarding/steps/3')
      .send({ estiloAprendizagemAutodeclarado: { visual: true } });
    await http()
      .put('/onboarding/steps/4')
      .send({ dificuldades: ['matemática'] });
    await http()
      .put('/onboarding/steps/5')
      .send({ rotinaEstudo: { horasDia: 2 } });
    await http()
      .put('/onboarding/steps/6')
      .send({ autopercepcao: { confianca: 'media' } });
    // passo 7 (neurodivergência) deliberadamente OMITIDO — opcional (I10, doc 10 §3)
    await http().put('/onboarding/steps/8').send({ confirmado: true });

    const completar = await http().post('/onboarding/complete');
    expect(completar.status).toBe(201);
    expect(completar.body).toEqual({ concluido: true });

    const estado = await http().get('/onboarding/state');
    expect(estado.body.concluido).toBe(true);
  });

  let sessaoId: string;
  let primeiraQuestaoId: string;

  it('POST /quiz/sessions inicia sessão e retorna 1ª questão SEM gabarito', async () => {
    const res = await http().post('/quiz/sessions').send({ area: 'matematica' });
    expect(res.status).toBe(201);
    expect(res.body.sessaoId).toBeTruthy();
    expect(res.body.primeiraQuestao.numero).toBe(1);
    expect(res.body.primeiraQuestao).not.toHaveProperty('gabarito');

    sessaoId = res.body.sessaoId;
    primeiraQuestaoId = res.body.primeiraQuestao.itemId;
  });

  it('POST /quiz/sessions/:id/answers com resposta CORRETA aumenta theta e dá XP', async () => {
    // gabarito do item seed 1 é "b" — usamos o itemId real retornado, então
    // descobrimos a resposta certa só se for o item 1; testamos via 2 chamadas
    // possíveis não é necessário: a 1ª questão sempre é a mais informativa em
    // theta=0, que no seed é o item 2 (paramB=0). Resposta certa = "b".
    const res = await http()
      .post(`/quiz/sessions/${sessaoId}/answers`)
      .set('Idempotency-Key', 'resp-1')
      .send({ itemId: primeiraQuestaoId, respostaId: 'b', tempoRespostaMs: 8000 });

    expect(res.status).toBe(201);
    expect(res.body.acerto).toBe(true);
    expect(res.body.theta).toBeGreaterThan(0);
    expect(res.body.xpGanho).toBe(15);
    expect(res.body.proximaQuestao).not.toBeNull();
    expect(res.body.proximaQuestao.itemId).not.toBe(primeiraQuestaoId);
  });

  it('GET /me/xp reflete o lançamento append-only da resposta + bônus da conquista (E9)', async () => {
    const res = await http().get('/me/xp');
    expect(res.status).toBe(200);
    expect(res.body.items).toContainEqual(expect.objectContaining({ origem: 'quiz', valor: 15 }));
    // "primeiro_xp" (1º lançamento) é concedido na mesma chamada — XP da conquista some-se ao do quiz.
    expect(res.body.items).toContainEqual(expect.objectContaining({ origem: 'conquista', valor: 5 }));
  });

  it('GET /me/streak conta a atividade de hoje como 1º dia consecutivo (E9)', async () => {
    const res = await http().get('/me/streak');
    expect(res.status).toBe(200);
    expect(res.body.diasConsecutivos).toBe(1);
    expect(res.body.ultimaAtividade).not.toBeNull();
  });

  it('GET /me/achievements concede "primeiro_xp" depois do 1º lançamento (E9)', async () => {
    const res = await http().get('/me/achievements');
    expect(res.status).toBe(200);
    expect(res.body.desbloqueadas.map((a: { codigo: string }) => a.codigo)).toContain('primeiro_xp');
  });

  it('GET /me/cognitive-profile expõe os 4 eixos + confiança, atualizados em background (E3)', async () => {
    const res = await http().get('/me/cognitive-profile');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('eixoReflexivoImpulsivo');
    expect(res.body).toHaveProperty('confianca');
    expect(res.body).toHaveProperty('recomendacoesAtivas');
  });

  it('GET /me/dashboard agrega XP, streak e estimativa de nota marcada nao_calibrado (E4)', async () => {
    const res = await http().get('/me/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.xpTotal).toBe(20); // 15 (quiz) + 5 (conquista "primeiro_xp")
    expect(res.body.streak.diasConsecutivos).toBe(1);
    expect(res.body.estimativaNota.naoCalibrado).toBe(true);
  });

  it('resposta ERRADA aciona o Detector de Padrão de Erro (E5) e grava a ocorrência', async () => {
    const proximaQuestao = await http().get(`/quiz/sessions/${sessaoId}/next-item`);
    const itemId = proximaQuestao.body.itemId;

    const res = await http()
      .post(`/quiz/sessions/${sessaoId}/answers`)
      .set('Idempotency-Key', 'resp-erro-1')
      .send({ itemId, respostaId: 'zzz-resposta-inexistente', tempoRespostaMs: 8000 });

    expect(res.status).toBe(201);
    expect(res.body.acerto).toBe(false);
    expect(['lacuna_conhecimento', 'deslize_atencao']).toContain(res.body.feedback.classificacaoErro);
    expect(errorDetectorRepo.ocorrencias).toHaveLength(1);
    expect(errorDetectorRepo.ocorrencias[0]).toMatchObject({ estudanteId: ESTUDANTE_ID, itemId });
  });

  it('reenviar a MESMA Idempotency-Key não soma XP nem muda theta de novo', async () => {
    const antes = await http().get(`/quiz/sessions/${sessaoId}/next-item`);
    const res = await http()
      .post(`/quiz/sessions/${sessaoId}/answers`)
      .set('Idempotency-Key', 'resp-1') // mesma chave do teste anterior
      .send({ itemId: primeiraQuestaoId, respostaId: 'b', tempoRespostaMs: 8000 });

    expect(res.status).toBe(201);
    expect(res.body.xpGanho).toBe(0); // idempotente — não soma de novo
    const depois = await http().get(`/quiz/sessions/${sessaoId}/next-item`);
    expect(depois.body.itemId).toBe(antes.body.itemId); // estado não avançou
  });

  it('GET /quiz/sessions/:id/next-item nunca repete item já exposto', async () => {
    const res = await http().get(`/quiz/sessions/${sessaoId}/next-item`);
    expect(res.status).toBe(200);
    expect(res.body.itemId).not.toBe(primeiraQuestaoId);
  });

  it('POST /quiz/sessions/:id/finish encerra a sessão', async () => {
    const res = await http().post(`/quiz/sessions/${sessaoId}/finish`);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'concluida' });
  });

  it('outro usuário NÃO consegue acessar a sessão do primeiro (404, não 403 — doc 10)', async () => {
    const tokenOutro = await signToken('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    const res = await supertest(app.getHttpAdapter().getInstance().server)
      .get(`/quiz/sessions/${sessaoId}/next-item`)
      .set('Authorization', `Bearer ${tokenOutro}`);
    expect(res.status).toBe(404);
  });
});
