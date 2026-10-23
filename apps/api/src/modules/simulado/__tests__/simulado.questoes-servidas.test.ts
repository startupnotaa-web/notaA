import type { LLMProviderPort } from '@notaa/contracts';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GamificacaoService } from '../../gamificacao/gamificacao.service';
import { SimuladoSessaoService } from '../simulado-sessao.service';

// Os dois pontos da API que sorteiam questão do ENEM para o aluno, contra
// Postgres de verdade (PGlite, migrações reais): nenhum deles pode entregar
// questão suspensa/anulada/arquivada nem item de outro idioma.

const ESTUDANTE = '11111111-0000-4000-8000-000000000001';
const ALTERNATIVAS = JSON.stringify(['Alternativa um', 'Alternativa dois', 'Alternativa três', 'Alternativa quatro', 'Alternativa cinco']);

// IA falsa: completa o que o banco não cobre. O que importa aqui são os ids do ENEM.
const llm = {
  complete: async () => ({
    data: { enunciado: 'Questão gerada.', alternativas: ['aaaa', 'bbbb', 'cccc', 'dddd', 'eeee'], correta: 0 },
    uso: { tokensIn: 0, tokensOut: 0, custoEstimado: 0, latenciaMs: 0 },
  }),
} as unknown as LLMProviderPort;

let banco: BancoDeTeste;
let sessao: SimuladoSessaoService;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status)
    VALUES ('${ESTUDANTE}', '${ESTUDANTE}', 'estudante', 'aluno@a.test', 'Aluno', 'ativo');
  `);
  sessao = new SimuladoSessaoService(banco.db, llm, {} as GamificacaoService);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

beforeEach(async () => {
  await banco.pg.exec(`
    DELETE FROM simulado_questao; DELETE FROM simulado_sessao; DELETE FROM sessao_avaliativa;
    DELETE FROM banco_de_itens; DELETE FROM questoes_enem;
  `);
});

async function questao(
  enunciado: string,
  o: { situacao?: 'suspensa' | 'anulada' | 'arquivada'; idioma?: 'ingles' | 'espanhol' } = {},
): Promise<string> {
  const r = await banco.pg.query<{ id: string }>(
    `INSERT INTO questoes_enem (area, ano, enunciado, alternativas, correta, dificuldade_tri, idioma)
     VALUES ('linguagens', 2024, $1, $2::jsonb, 0, 'facil', $3) RETURNING id`,
    [enunciado, ALTERNATIVAS, o.idioma ?? null],
  );
  const id = r.rows[0]!.id;
  if (o.situacao) {
    await banco.pg.query(`INSERT INTO questao_suspensa (questao_id, situacao, motivos) VALUES ($1, $2, ARRAY['teste'])`, [id, o.situacao]);
  }
  return id;
}

/** Ids do ENEM que entraram numa prova montada (o resto é IA, com id novo). */
async function idsDoEnemNaProva(idioma?: 'ingles' | 'espanhol'): Promise<string[]> {
  const prova = await sessao.start(ESTUDANTE, 'livre', undefined, idioma);
  const itens = await banco.pg.query<{ id: string }>('SELECT id FROM questoes_enem');
  const doEnem = new Set(itens.rows.map((r) => r.id));
  return prova.questoes.map((q) => q.itemId).filter((id) => doEnem.has(id));
}

describe('simulado de sessão: SimuladoSessaoService.start', () => {
  it('nunca entrega questão suspensa, anulada ou arquivada', async () => {
    const boas = [await questao('Boa um.'), await questao('Boa dois.'), await questao('Boa três.')];
    const fora = [
      await questao('Suspensa.', { situacao: 'suspensa' }),
      await questao('Anulada.', { situacao: 'anulada' }),
      await questao('Arquivada.', { situacao: 'arquivada' }),
    ];
    const servidas = await idsDoEnemNaProva();
    expect(servidas.sort()).toEqual(boas.sort()); // 3 vagas fáceis de linguagens, 3 boas
    for (const id of fora) expect(servidas).not.toContain(id);
  });

  it('sem idioma informado, não entrega item de língua estrangeira', async () => {
    const comum = await questao('Comum um.');
    await questao('Inglês.', { idioma: 'ingles' });
    await questao('Espanhol.', { idioma: 'espanhol' });
    expect(await idsDoEnemNaProva()).toEqual([comum]);
  });

  it('com idioma, entrega só aquela versão', async () => {
    const comum = await questao('Comum.');
    const ing = await questao('Inglês.', { idioma: 'ingles' });
    const esp = await questao('Espanhol.', { idioma: 'espanhol' });
    expect((await idsDoEnemNaProva('ingles')).sort()).toEqual([comum, ing].sort());
    await banco.pg.exec('DELETE FROM simulado_questao; DELETE FROM simulado_sessao; DELETE FROM sessao_avaliativa; DELETE FROM banco_de_itens WHERE true;');
    expect((await idsDoEnemNaProva('espanhol')).sort()).toEqual([comum, esp].sort());
  });

  it('versão do idioma escolhido, mas suspensa, não é entregue', async () => {
    await questao('Inglês suspenso.', { idioma: 'ingles', situacao: 'suspensa' });
    expect(await idsDoEnemNaProva('ingles')).toEqual([]);
  });
});
