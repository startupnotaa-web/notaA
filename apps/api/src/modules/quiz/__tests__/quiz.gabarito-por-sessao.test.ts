import { randomUUID } from 'node:crypto';
import type { LLMProviderPort } from '@notaa/contracts';
import { QuizRepositoryDb } from '@notaa/db';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { QuizService } from '../quiz.service';

// O gabarito de um item só sai na resposta de quem o recebeu nesta sessão, uma vez.
// Contra Postgres de verdade (PGlite, migrações reais), pelo QuizService.

const ALUNO = '11111111-0000-4000-8000-0000000000a1';
const OUTRO = '11111111-0000-4000-8000-0000000000a2';

let banco: BancoDeTeste;

// IA falsa: gabarito 'A' sempre (correta = 0).
const llm = {
  complete: async () => ({
    data: { enunciado: 'Quanto é 2 + 2?', alternativas: ['4', '5', '6', '7', '8'], correta: 0 },
    uso: { tokensIn: 0, tokensOut: 0, custoEstimado: 0, latenciaMs: 0 },
  }),
} as unknown as LLMProviderPort;

function servico(): QuizService {
  const repo = new QuizRepositoryDb(banco.db as never);
  const gamificacao = {
    grantXp: async () => ({ xpTotal: 10, nivel: 1, subiuDeNivel: false }),
    registrarAtividadeValida: async () => undefined,
    nivelAtual: async () => ({ xpTotal: 0, nivel: 1, subiuDeNivel: false }),
  };
  const uow = { run: async (fn: (ctx: unknown) => Promise<unknown>) => fn({ quizRepo: repo, gamificacao }) };
  return new QuizService(
    repo,
    gamificacao as never,
    { atualizarComRespostaQuiz: async () => undefined } as never,
    { classificarErro: async () => ({ classificacao: null }) } as never,
    llm,
    { montarBloco: async () => '' } as never,
    uow as never,
  );
}

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status) VALUES
      ('${ALUNO}', '${ALUNO}', 'estudante', 'aluno@a.test', 'Aluno', 'ativo'),
      ('${OUTRO}', '${OUTRO}', 'estudante', 'outro@a.test', 'Outro', 'ativo');
  `);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

beforeEach(async () => {
  await banco.pg.exec(`
    DELETE FROM quiz_item_servido; DELETE FROM tentativa_resposta; DELETE FROM sessao_avaliativa;
    DELETE FROM banco_de_itens;
  `);
});

async function codigoDoErro(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    const corpo = (e as { getResponse?: () => { error?: { code?: string } } }).getResponse?.();
    return corpo?.error?.code;
  }
}

async function contaTentativas(): Promise<number> {
  const r = await banco.pg.query<{ n: number }>('SELECT count(*)::int AS n FROM tentativa_resposta');
  return r.rows[0]!.n;
}

describe('quiz: gabarito só para item servido nesta sessão', () => {
  it('responde o item servido à própria sessão e devolve o gabarito', async () => {
    const s = servico();
    const { sessaoId, primeiraQuestao } = await s.startSession(ALUNO, 'matematica');
    const r = await s.submitAnswer(
      sessaoId,
      ALUNO,
      { itemId: primeiraQuestao.itemId, respostaId: 'A', tempoRespostaMs: 1000 },
      randomUUID(),
    );
    expect(r.gabarito).toBe('A');
    expect(r.acerto).toBe(true);
  });

  it('recusa item de OUTRA sessão do mesmo aluno, sem devolver gabarito', async () => {
    const s = servico();
    const primeira = await s.startSession(ALUNO, 'matematica');
    const segunda = await s.startSession(ALUNO, 'matematica');
    const erro = await codigoDoErro(
      s.submitAnswer(
        segunda.sessaoId,
        ALUNO,
        { itemId: primeira.primeiraQuestao.itemId, respostaId: 'A', tempoRespostaMs: 1000 },
        randomUUID(),
      ),
    );
    expect(erro).toBe('ITEM_NAO_SERVIDO');
    expect(await contaTentativas()).toBe(0);
  });

  it('recusa item servido a OUTRO aluno', async () => {
    const s = servico();
    const do_outro = await s.startSession(OUTRO, 'matematica');
    const minha = await s.startSession(ALUNO, 'matematica');
    const erro = await codigoDoErro(
      s.submitAnswer(
        minha.sessaoId,
        ALUNO,
        { itemId: do_outro.primeiraQuestao.itemId, respostaId: 'A', tempoRespostaMs: 1000 },
        randomUUID(),
      ),
    );
    expect(erro).toBe('ITEM_NAO_SERVIDO');
  });

  it('recusa item de simulado em andamento (está no banco, nunca foi servido pelo quiz)', async () => {
    const id = randomUUID();
    await banco.pg.query(
      `INSERT INTO banco_de_itens (id, area_conhecimento, competencia, param_a, param_b, param_c, enunciado, alternativas, gabarito)
       VALUES ($1, 'matematica', 'SIMULADO_FACIL', 1, 0, 0.2, 'Questão do simulado.', '["1","2","3","4","5"]', 'C')`,
      [id],
    );
    const s = servico();
    const { sessaoId } = await s.startSession(ALUNO, 'matematica');
    const erro = await codigoDoErro(
      s.submitAnswer(sessaoId, ALUNO, { itemId: id, respostaId: 'C', tempoRespostaMs: 1000 }, randomUUID()),
    );
    expect(erro).toBe('ITEM_NAO_SERVIDO');
    expect(await contaTentativas()).toBe(0);
  });

  it('item já respondido com outra tentativa não é corrigido de novo, sem devolver gabarito', async () => {
    const s = servico();
    const { sessaoId, primeiraQuestao } = await s.startSession(ALUNO, 'matematica');
    const item = { itemId: primeiraQuestao.itemId, respostaId: 'B', tempoRespostaMs: 1000 };
    await s.submitAnswer(sessaoId, ALUNO, item, randomUUID());
    const erro = await codigoDoErro(s.submitAnswer(sessaoId, ALUNO, { ...item, respostaId: 'A' }, randomUUID()));
    expect(erro).toBe('ITEM_JA_RESPONDIDO');
    expect(await contaTentativas()).toBe(1);
  });

  it('reenvio com a MESMA chave segue idempotente (duplicate, sem tentativa nova)', async () => {
    const s = servico();
    const { sessaoId, primeiraQuestao } = await s.startSession(ALUNO, 'matematica');
    const chave = randomUUID();
    const item = { itemId: primeiraQuestao.itemId, respostaId: 'A', tempoRespostaMs: 1000 };
    const primeira = await s.submitAnswer(sessaoId, ALUNO, item, chave);
    const reenvio = await s.submitAnswer(sessaoId, ALUNO, item, chave);
    // reenvio não lança XP de novo (duplicate no núcleo transacional)
    expect(primeira.xpGanho).toBeGreaterThan(0);
    expect(reenvio.xpGanho).toBe(0);
    expect(reenvio.gabarito).toBe('A');
    expect(await contaTentativas()).toBe(1);
  });
});

