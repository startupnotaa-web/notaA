import { describe, expect, it } from 'vitest';
import {
  VALIDADE_CODIGO_CONVITE_DIAS,
  VALIDADE_CONVITE_PROFESSOR_DIAS,
  calcularExpiracaoCodigo,
  calcularExpiracaoConviteProfessor,
  conviteProfessorValido,
  codigoDeConviteValido,
  dadoEstaNaJanela,
  janelaDeDados,
  podeAprovarMatricula,
  podeCriarTurma,
  podeGerenciarAnoLetivo,
  turmaAceitaAluno,
} from '../escopo.regras';

describe('quem cria turma (perfis.md)', () => {
  it('instituição e professor independente criam', () => {
    expect(podeCriarTurma('admin_instituicao')).toBe(true);
    expect(podeCriarTurma('professor_independente')).toBe(true);
  });

  it('professor VINCULADO a instituição não cria — só leciona no que a instituição atribuir', () => {
    expect(podeCriarTurma('professor_institucional')).toBe(false);
  });

  it('aluno, responsável e admin da plataforma não criam', () => {
    expect(podeCriarTurma('estudante')).toBe(false);
    expect(podeCriarTurma('responsavel')).toBe(false);
    expect(podeCriarTurma('admin')).toBe(false);
  });

  it('gerenciar ano letivo segue a mesma regra de criar turma (é ato de dono)', () => {
    expect(podeGerenciarAnoLetivo('admin_instituicao')).toBe(true);
    expect(podeGerenciarAnoLetivo('professor_institucional')).toBe(false);
  });
});

describe('quem aprova solicitação de entrada', () => {
  it('os dois tipos de professor e o admin de instituição aprovam', () => {
    expect(podeAprovarMatricula('professor_institucional')).toBe(true);
    expect(podeAprovarMatricula('professor_independente')).toBe(true);
    expect(podeAprovarMatricula('admin_instituicao')).toBe(true);
  });

  it('aluno não aprova a própria entrada', () => {
    expect(podeAprovarMatricula('estudante')).toBe(false);
  });
});

describe('turma aceita aluno', () => {
  it('não aceita sem professor — a regra "não existe turma sem professor" vira esta', () => {
    expect(turmaAceitaAluno({ quantidadeDeProfessores: 0, arquivada: false })).toBe(false);
  });

  it('não aceita se arquivada, mesmo com professor', () => {
    expect(turmaAceitaAluno({ quantidadeDeProfessores: 2, arquivada: true })).toBe(false);
  });

  it('aceita com pelo menos um professor e ativa', () => {
    expect(turmaAceitaAluno({ quantidadeDeProfessores: 1, arquivada: false })).toBe(true);
  });
});

describe('código de convite', () => {
  const agora = new Date('2026-10-02T12:00:00Z');

  it(`expira em ${VALIDADE_CODIGO_CONVITE_DIAS} dias`, () => {
    const expira = calcularExpiracaoCodigo(agora);
    const dias = (expira.getTime() - agora.getTime()) / 86_400_000;
    expect(dias).toBe(VALIDADE_CODIGO_CONVITE_DIAS);
  });

  it('vale enquanto não passou da expiração', () => {
    expect(
      codigoDeConviteValido(
        { codigoConvite: 'ABC123', codigoExpiraEm: new Date('2026-10-05T12:00:00Z') },
        agora,
      ),
    ).toBe(true);
  });

  it('não vale depois de expirar', () => {
    expect(
      codigoDeConviteValido(
        { codigoConvite: 'ABC123', codigoExpiraEm: new Date('2026-10-01T12:00:00Z') },
        agora,
      ),
    ).toBe(false);
  });

  it('não vale sem código (turma criada e ainda sem convite gerado)', () => {
    expect(codigoDeConviteValido({ codigoConvite: null, codigoExpiraEm: null }, agora)).toBe(false);
  });
});

describe('janela de dados — o que instituição e professor podem ver', () => {
  const aprovacao = new Date('2026-03-01T00:00:00Z');

  it('começa na aprovação da matrícula', () => {
    expect(janelaDeDados([{ status: 'ativa', aprovadoEm: aprovacao }])).toEqual(aprovacao);
  });

  it('matrícula pendente não abre janela — o aluno ainda não autorizou', () => {
    expect(janelaDeDados([{ status: 'pendente', aprovadoEm: null }])).toBeNull();
  });

  it('matrícula recusada ou removida não abre janela', () => {
    expect(janelaDeDados([{ status: 'recusada', aprovadoEm: null }])).toBeNull();
    expect(janelaDeDados([{ status: 'removida', aprovadoEm: aprovacao }])).toBeNull();
  });

  it('com várias turmas, vale a aprovação mais antiga', () => {
    const maisAntiga = new Date('2026-02-01T00:00:00Z');
    expect(
      janelaDeDados([
        { status: 'ativa', aprovadoEm: aprovacao },
        { status: 'ativa', aprovadoEm: maisAntiga },
      ]),
    ).toEqual(maisAntiga);
  });

  it('ignora turma pendente ao calcular a janela de quem já tem turma ativa', () => {
    expect(
      janelaDeDados([
        { status: 'pendente', aprovadoEm: null },
        { status: 'ativa', aprovadoEm: aprovacao },
      ]),
    ).toEqual(aprovacao);
  });

  it('sem matrícula nenhuma, não há janela', () => {
    expect(janelaDeDados([])).toBeNull();
  });
});

describe('dado dentro da janela', () => {
  const janela = new Date('2026-03-01T00:00:00Z');

  it('dado anterior à aprovação fica invisível', () => {
    expect(dadoEstaNaJanela(new Date('2026-02-28T23:59:59Z'), janela)).toBe(false);
  });

  it('dado no exato instante da aprovação é visível', () => {
    expect(dadoEstaNaJanela(janela, janela)).toBe(true);
  });

  it('dado posterior é visível', () => {
    expect(dadoEstaNaJanela(new Date('2026-04-01T00:00:00Z'), janela)).toBe(true);
  });

  it('sem janela, nada é visível', () => {
    expect(dadoEstaNaJanela(new Date('2026-04-01T00:00:00Z'), null)).toBe(false);
  });
});

describe('convite de professor institucional', () => {
  const agora = new Date('2026-10-02T12:00:00Z');
  const aberto = {
    expiraEm: new Date('2026-10-10T12:00:00Z'),
    usadoEm: null,
    revogadoEm: null,
  };

  it(`expira em ${VALIDADE_CONVITE_PROFESSOR_DIAS} dias`, () => {
    const expira = calcularExpiracaoConviteProfessor(agora);
    const dias = (expira.getTime() - agora.getTime()) / 86_400_000;
    expect(dias).toBe(VALIDADE_CONVITE_PROFESSOR_DIAS);
  });

  it('vale enquanto aberto e dentro do prazo', () => {
    expect(conviteProfessorValido(aberto, agora)).toBe(true);
  });

  it('não vale depois do prazo', () => {
    expect(
      conviteProfessorValido({ ...aberto, expiraEm: new Date('2026-09-30T12:00:00Z') }, agora),
    ).toBe(false);
  });

  it('não vale depois de usado — o token é queimado no primeiro uso', () => {
    expect(conviteProfessorValido({ ...aberto, usadoEm: agora }, agora)).toBe(false);
  });

  it('não vale depois de revogado pela instituição', () => {
    expect(conviteProfessorValido({ ...aberto, revogadoEm: agora }, agora)).toBe(false);
  });
});
