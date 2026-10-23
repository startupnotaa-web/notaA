import 'reflect-metadata';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { criarBancoDeTeste, type BancoDeTeste } from '@notaa/db/src/testing/banco-de-teste';
import { lerContexto, serializarContexto, type ContextoDeAcesso, type Papel } from '@notaa/contracts';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SemValidarContexto } from '../../../common/decorators/sem-validar-contexto.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ContextoGuard } from '../../../common/guards/contexto.guard';
import { TTL_STATUS_MS, UsuarioAtivoGuard } from '../../../common/guards/usuario-ativo.guard';
import { ContextosService } from '../contextos.service';
import { UsuarioStatusDb } from '../usuario-status';

// Contexto de acesso ("Entrar como…") e bloqueio de conta inativa. Banco real (PGlite) com as
// migrações de verdade: a lista de contextos sai dos vínculos, nunca do que o cliente manda.

const INST_A = '0000000a-0000-4000-8000-000000000000';
const INST_B = '0000000b-0000-4000-8000-000000000000';
const ANO = '00000a00-0000-4000-8000-000000000000';
const TURMA_A = '000000a1-0000-4000-8000-000000000000';
const TURMA_B = '000000b1-0000-4000-8000-000000000000';
const TURMA_B2 = '000000b2-0000-4000-8000-000000000000';

const ALUNO_2 = 'a1000000-0000-4000-8000-000000000002'; // em duas instituições
const ALUNO_1 = 'a1000000-0000-4000-8000-000000000001'; // em uma
const ALUNO_0 = 'a1000000-0000-4000-8000-000000000000'; // sem turma
const ALUNO_PENDENTE = 'a1000000-0000-4000-8000-0000000000aa'; // matrícula ainda pendente em B
const PROF_2 = 'b1000000-0000-4000-8000-000000000002'; // leciona em A e B
const PROF_IND = 'b1000000-0000-4000-8000-000000000009';
const ADMIN_A = 'c1000000-0000-4000-8000-000000000001';
const ADMIN_SEM_INST = 'c1000000-0000-4000-8000-000000000009';
const RESP = 'd1000000-0000-4000-8000-000000000001'; // dois filhos ativos e um pendente
const RESP_0 = 'd1000000-0000-4000-8000-000000000000';
const PLATAFORMA = 'e1000000-0000-4000-8000-000000000001';
const SUSPENSO = 'f1000000-0000-4000-8000-000000000001';
const PENDENTE = 'f1000000-0000-4000-8000-000000000002';

let banco: BancoDeTeste;
let servico: ContextosService;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await banco.pg.exec(`
    INSERT INTO instituicao (id, nome) VALUES ('${INST_A}', 'Colégio A'), ('${INST_B}', 'Colégio B');
    INSERT INTO usuario (id, auth_uid, tipo_perfil, email, nome, status, instituicao_id) VALUES
      ('${ALUNO_2}', '${ALUNO_2}', 'estudante', 'a2@x.test', 'Aluno Dois', 'ativo', NULL),
      ('${ALUNO_1}', '${ALUNO_1}', 'estudante', 'a1@x.test', 'Aluno Um', 'ativo', NULL),
      ('${ALUNO_0}', '${ALUNO_0}', 'estudante', 'a0@x.test', 'Aluno Zero', 'ativo', NULL),
      ('${ALUNO_PENDENTE}', '${ALUNO_PENDENTE}', 'estudante', 'ap@x.test', 'Aluno Pendente', 'ativo', NULL),
      ('${PROF_2}', '${PROF_2}', 'professor_institucional', 'p2@x.test', 'Prof Dois', 'ativo', '${INST_A}'),
      ('${PROF_IND}', '${PROF_IND}', 'professor_independente', 'pi@x.test', 'Prof Ind', 'ativo', NULL),
      ('${ADMIN_A}', '${ADMIN_A}', 'admin_instituicao', 'aa@x.test', 'Admin A', 'ativo', '${INST_A}'),
      ('${ADMIN_SEM_INST}', '${ADMIN_SEM_INST}', 'admin_instituicao', 'as@x.test', 'Admin S', 'ativo', NULL),
      ('${RESP}', '${RESP}', 'responsavel', 'r@x.test', 'Resp', 'ativo', NULL),
      ('${RESP_0}', '${RESP_0}', 'responsavel', 'r0@x.test', 'Resp Zero', 'ativo', NULL),
      ('${PLATAFORMA}', '${PLATAFORMA}', 'admin', 'pl@x.test', 'Plataforma', 'ativo', NULL),
      ('${SUSPENSO}', '${SUSPENSO}', 'estudante', 's@x.test', 'Suspenso', 'suspenso', NULL),
      ('${PENDENTE}', '${PENDENTE}', 'estudante', 'pe@x.test', 'Pendente', 'pendente', NULL);
    INSERT INTO ano_letivo (id, rotulo) VALUES ('${ANO}', '2026');
    INSERT INTO turma (id, instituicao_id, ano_letivo_id, nome) VALUES
      ('${TURMA_A}', '${INST_A}', '${ANO}', '1A'),
      ('${TURMA_B}', '${INST_B}', '${ANO}', '1B'),
      ('${TURMA_B2}', '${INST_B}', '${ANO}', '2B');
    INSERT INTO professor_turma (turma_id, professor_id) VALUES ('${TURMA_A}', '${PROF_2}'), ('${TURMA_B}', '${PROF_2}');
    INSERT INTO matricula_turma (turma_id, estudante_id, status, aprovado_em) VALUES
      ('${TURMA_A}', '${ALUNO_2}', 'ativa', now()),
      ('${TURMA_B}', '${ALUNO_2}', 'ativa', now()),
      ('${TURMA_B2}', '${ALUNO_2}', 'ativa', now()),
      ('${TURMA_A}', '${ALUNO_1}', 'ativa', now());
    INSERT INTO matricula_turma (turma_id, estudante_id, status) VALUES ('${TURMA_B}', '${ALUNO_PENDENTE}', 'pendente');
    INSERT INTO vinculo_responsavel (responsavel_id, estudante_id, status) VALUES
      ('${RESP}', '${ALUNO_2}', 'ativo'),
      ('${RESP}', '${ALUNO_1}', 'ativo'),
      ('${RESP}', '${ALUNO_0}', 'pendente');
  `);
  servico = new ContextosService(banco.db);
}, 60_000);

afterAll(async () => {
  await banco?.pg.close();
});

const rotulos = async (id: string, papel: Papel) => (await servico.listar(id, papel)).map((c) => c.rotulo);

describe('ContextosService.listar: sai dos vínculos reais', () => {
  it('aluno em duas instituições (três turmas) tem dois contextos, sem repetir', async () => {
    expect(await rotulos(ALUNO_2, 'estudante')).toEqual(['Colégio A', 'Colégio B']);
  });

  it('aluno em uma instituição tem um contexto; sem turma, só "Minha conta"', async () => {
    expect(await rotulos(ALUNO_1, 'estudante')).toEqual(['Colégio A']);
    expect(await rotulos(ALUNO_0, 'estudante')).toEqual(['Minha conta']);
  });

  it('matrícula pendente não conta como vínculo', async () => {
    expect(await rotulos(ALUNO_PENDENTE, 'estudante')).toEqual(['Minha conta']);
  });

  it('professor institucional que leciona em duas instituições tem dois contextos', async () => {
    expect(await rotulos(PROF_2, 'professor_institucional')).toEqual(['Colégio A', 'Colégio B']);
  });

  it('admin de instituição tem a própria; sem instituição, "Minha conta"', async () => {
    expect(await rotulos(ADMIN_A, 'admin_instituicao')).toEqual(['Colégio A']);
    expect(await rotulos(ADMIN_SEM_INST, 'admin_instituicao')).toEqual(['Minha conta']);
  });

  it('responsável tem um contexto por filho ATIVO; o vínculo pendente fica de fora', async () => {
    const lista = await servico.listar(RESP, 'responsavel');
    expect(lista.map((c) => c.rotulo)).toEqual(['Aluno Dois', 'Aluno Um']);
    expect(lista.every((c) => c.papel === 'responsavel' && c.instituicaoId === null)).toBe(true);
    expect(lista.map((c) => c.estudanteId).sort()).toEqual([ALUNO_1, ALUNO_2]);
    expect(await rotulos(RESP_0, 'responsavel')).toEqual(['Minha conta']);
  });

  it('professor independente e admin da plataforma têm um contexto só', async () => {
    expect(await rotulos(PROF_IND, 'professor_independente')).toEqual(['Minha conta']);
    expect(await rotulos(PLATAFORMA, 'admin')).toEqual(['Minha conta']);
  });
});

describe('ContextosService.existe: o servidor confere o que o cliente pede', () => {
  const ctx = (papel: Papel, instituicaoId: string | null, estudanteId: string | null = null): ContextoDeAcesso => ({
    papel,
    instituicaoId,
    estudanteId,
  });

  it('aceita um vínculo real', async () => {
    expect(await servico.existe(ALUNO_2, 'estudante', ctx('estudante', INST_B))).toBe(true);
    expect(await servico.existe(RESP, 'responsavel', ctx('responsavel', null, ALUNO_1))).toBe(true);
  });

  it('recusa instituição em que a conta não tem vínculo', async () => {
    expect(await servico.existe(ALUNO_1, 'estudante', ctx('estudante', INST_B))).toBe(false);
    expect(await servico.existe(ADMIN_A, 'admin_instituicao', ctx('admin_instituicao', INST_B))).toBe(false);
  });

  it('recusa filho de outro responsável e vínculo pendente', async () => {
    expect(await servico.existe(RESP_0, 'responsavel', ctx('responsavel', null, ALUNO_1))).toBe(false);
    expect(await servico.existe(RESP, 'responsavel', ctx('responsavel', null, ALUNO_0))).toBe(false);
  });

  it('recusa papel diferente do que está no token (sem escalar privilégio)', async () => {
    expect(await servico.existe(ALUNO_2, 'estudante', ctx('admin_instituicao', INST_A))).toBe(false);
    expect(await servico.existe(PROF_2, 'professor_institucional', ctx('admin', null))).toBe(false);
  });

  it('recusa o contexto pessoal de quem tem vínculos (só há o que a lista tem)', async () => {
    expect(await servico.existe(ALUNO_2, 'estudante', ctx('estudante', null))).toBe(false);
  });
});

describe('ContextosService.registrarTroca: auditoria só com ids', () => {
  it('grava de/para em ids, sem instituição na linha e sem nome ou e-mail', async () => {
    await servico.registrarTroca(
      ALUNO_2,
      'estudante',
      { papel: 'estudante', instituicaoId: INST_A, estudanteId: null },
      { papel: 'estudante', instituicaoId: INST_B, estudanteId: null },
    );
    const { rows } = await banco.pg.query<{
      instituicao_id: string | null;
      ator_id: string;
      acao: string;
      entidade: string;
      dados: unknown;
    }>(`SELECT instituicao_id, ator_id, acao, entidade, dados FROM audit_log WHERE acao = 'contexto.trocado'`);
    expect(rows).toHaveLength(1);
    const linha = rows[0]!;
    expect(linha.instituicao_id).toBeNull();
    expect(linha.ator_id).toBe(ALUNO_2);
    expect(linha.entidade).toBe('contexto');
    expect(linha.dados).toEqual({
      de: { papel: 'estudante', instituicaoId: INST_A, estudanteId: null },
      para: { papel: 'estudante', instituicaoId: INST_B, estudanteId: null },
    });
    const texto = JSON.stringify(linha);
    expect(texto).not.toMatch(/@|Colégio|Aluno/);
  });

  it('a primeira escolha (sem contexto anterior) grava de: null', async () => {
    await servico.registrarTroca(PROF_2, 'professor_institucional', null, {
      papel: 'professor_institucional',
      instituicaoId: INST_A,
      estudanteId: null,
    });
    const { rows } = await banco.pg.query<{ dados: { de: unknown } }>(
      `SELECT dados FROM audit_log WHERE acao = 'contexto.trocado' AND ator_id = '${PROF_2}'`,
    );
    expect(rows[0]!.dados.de).toBeNull();
  });
});

// ── ContextoGuard ────────────────────────────────────────────────────────────────────────────

function http(request: Record<string, unknown>, alvo: { handler?: unknown; classe?: unknown } = {}): ExecutionContext {
  return {
    getHandler: () => alvo.handler ?? (() => undefined),
    getClass: () => alvo.classe ?? class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const usuarioAluno2 = { sub: ALUNO_2, app_metadata: { papel: 'estudante' as Papel } };

describe('ContextoGuard: revalida a cada requisição', () => {
  const guard = () => new ContextoGuard(new Reflector(), servico);
  const cabecalho = (c: ContextoDeAcesso) => ({ 'x-contexto': serializarContexto(c) });

  it('sem cabeçalho passa (contexto padrão) e não consulta o banco', async () => {
    const espiao = vi.spyOn(servico, 'existe');
    await expect(guard().canActivate(http({ headers: {}, user: usuarioAluno2 }))).resolves.toBe(true);
    expect(espiao).not.toHaveBeenCalled();
    espiao.mockRestore();
  });

  it('com contexto real: passa e deixa o contexto validado na requisição', async () => {
    const pedido: ContextoDeAcesso = { papel: 'estudante', instituicaoId: INST_B, estudanteId: null };
    const request = { headers: cabecalho(pedido), user: usuarioAluno2 } as Record<string, unknown>;
    await expect(guard().canActivate(http(request))).resolves.toBe(true);
    expect(request.contexto).toEqual(pedido);
  });

  it('com instituição alheia: 403 CONTEXTO_INVALIDO', async () => {
    const request = {
      headers: cabecalho({ papel: 'estudante', instituicaoId: INST_B, estudanteId: null }),
      user: { sub: ALUNO_1, app_metadata: { papel: 'estudante' as Papel } },
    };
    const erro = await guard().canActivate(http(request)).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ForbiddenException);
    expect((erro as ForbiddenException).getResponse()).toMatchObject({ error: { code: 'CONTEXTO_INVALIDO' } });
  });

  it('cabeçalho que tenta virar outro papel é recusado', async () => {
    const request = {
      headers: cabecalho({ papel: 'admin_instituicao', instituicaoId: INST_A, estudanteId: null }),
      user: usuarioAluno2,
    };
    await expect(guard().canActivate(http(request))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(['lixo', 'estudante::', 'estudante:nao-e-uuid:', ':::', `estudante:${INST_A}:${INST_A}:extra`, ''])(
    'cabeçalho malformado %j é recusado',
    async (valor) => {
      await expect(
        guard().canActivate(http({ headers: { 'x-contexto': valor }, user: usuarioAluno2 })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('cabeçalho repetido é recusado', async () => {
    const valor = serializarContexto({ papel: 'estudante', instituicaoId: INST_A, estudanteId: null });
    await expect(
      guard().canActivate(http({ headers: { 'x-contexto': [valor, valor] }, user: usuarioAluno2 })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('vínculo removido depois de escolhido: a próxima requisição já é recusada', async () => {
    const pedido: ContextoDeAcesso = { papel: 'estudante', instituicaoId: INST_A, estudanteId: null };
    const request = () => ({ headers: cabecalho(pedido), user: { sub: ALUNO_1, app_metadata: { papel: 'estudante' as Papel } } });
    await expect(guard().canActivate(http(request()))).resolves.toBe(true);
    await banco.pg.exec(`UPDATE matricula_turma SET status = 'removida', aprovado_em = NULL WHERE estudante_id = '${ALUNO_1}'`);
    await expect(guard().canActivate(http(request()))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rota pública ignora o cabeçalho; as rotas de contexto não exigem contexto válido', async () => {
    class Publica {
      @Public()
      rota() {}
    }
    class DeContexto {
      @SemValidarContexto()
      rota() {}
    }
    const lixo = { headers: { 'x-contexto': 'lixo' }, user: usuarioAluno2 };
    await expect(guard().canActivate(http(lixo, { handler: Publica.prototype.rota, classe: Publica }))).resolves.toBe(true);
    await expect(guard().canActivate(http(lixo, { handler: DeContexto.prototype.rota, classe: DeContexto }))).resolves.toBe(true);
  });
});

// ── UsuarioAtivoGuard ────────────────────────────────────────────────────────────────────────

describe('UsuarioAtivoGuard: só conta ativa usa a API', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const guard = () => new UsuarioAtivoGuard(new Reflector(), new UsuarioStatusDb(banco.db));
  const como = (sub: string | undefined) => http({ user: sub ? { sub, app_metadata: { papel: 'estudante' } } : undefined });

  it('ativo passa', async () => {
    await expect(guard().canActivate(como(ALUNO_1))).resolves.toBe(true);
  });

  it.each([
    ['suspenso', SUSPENSO],
    ['pendente', PENDENTE],
  ])('%s recebe 403 CONTA_INATIVA mesmo com token válido', async (_nome, id) => {
    const erro = await guard().canActivate(como(id)).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ForbiddenException);
    expect((erro as ForbiddenException).getResponse()).toMatchObject({ error: { code: 'CONTA_INATIVA' } });
  });

  it('rota pública não consulta o banco', async () => {
    class Publica {
      @Public()
      rota() {}
    }
    const porta = new UsuarioStatusDb(banco.db);
    const espiao = vi.spyOn(porta, 'statusDe');
    await expect(
      new UsuarioAtivoGuard(new Reflector(), porta).canActivate(
        http({ user: { sub: SUSPENSO } }, { handler: Publica.prototype.rota, classe: Publica }),
      ),
    ).resolves.toBe(true);
    expect(espiao).not.toHaveBeenCalled();
  });

  it('sem usuário na requisição, a recusa é do AuthGuard', async () => {
    await expect(guard().canActivate(como(undefined))).resolves.toBe(true);
  });

  it('conta sem linha em usuario passa (a rota decide)', async () => {
    await expect(guard().canActivate(como('99999999-0000-4000-8000-000000000000'))).resolves.toBe(true);
  });

  it('suspensão vale depois do prazo do cache, não antes', async () => {
    vi.useFakeTimers();
    const g = guard();
    await expect(g.canActivate(como(ALUNO_0))).resolves.toBe(true);
    await banco.pg.exec(`UPDATE usuario SET status = 'suspenso' WHERE id = '${ALUNO_0}'`);

    vi.advanceTimersByTime(TTL_STATUS_MS - 1);
    await expect(g.canActivate(como(ALUNO_0))).resolves.toBe(true); // ainda em cache

    vi.advanceTimersByTime(2);
    await expect(g.canActivate(como(ALUNO_0))).rejects.toBeInstanceOf(ForbiddenException);
    await banco.pg.exec(`UPDATE usuario SET status = 'ativo' WHERE id = '${ALUNO_0}'`);
  });
});

describe('formato do cabeçalho', () => {
  it('serializar e ler são inversos', () => {
    const c: ContextoDeAcesso = { papel: 'responsavel', instituicaoId: null, estudanteId: ALUNO_1 };
    expect(lerContexto(serializarContexto(c))).toEqual(c);
  });
});
