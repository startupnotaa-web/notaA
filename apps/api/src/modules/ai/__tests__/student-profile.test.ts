import { describe, expect, it } from 'vitest';
import {
  FATOS_VAZIOS,
  montarBlocoAluno,
  montarPromptCorretorRedacao,
  montarPromptQuiz,
  montarPromptSocratico,
  type FatosAluno,
} from '@notaa/prompts';
import { legivelObjetivo, niveisPorArea, temasErrados, tracosDoPerfil4D } from '../student-profile.service';
import { temasDaTrilha } from '../../study-trails/study-trails.service';

// O bloco do aluno é a única tradução de dados → linguagem para o modelo.
// Estes testes garantem as promessas feitas ao produto (2026-09-15):
//   - nenhum número cru chega ao prompt;
//   - o mesmo fato vira instrução diferente por canal;
//   - aluno sem dados recebe um bloco que diz isso, não um perfil inventado.

const DAVI: FatosAluno = {
  ...FATOS_VAZIOS,
  nome: 'Davi',
  idade: 17,
  serie: '3º ano',
  objetivo: 'Medicina',
  notaAlvo: 850,
  estilosDeclarados: ['Visual', 'Prático'],
  dificuldadesDeclaradas: ['Matemática', 'Redação'],
  minutosPorDia: 60,
  autopercepcao: 'passo_a_passo',
  tracosObservados: ['impulsivo', 'analitico'],
  confiancaPerfil: 0.5,
  nivelPorArea: { matematica: 'iniciante', natureza: 'intermediario' },
  temasErradosRecentes: ['Função quadrática', 'Balanceamento de equações'],
  recomendacoesAtivas: [],
};

describe('montarBlocoAluno — fatos em linguagem natural', () => {
  it('traduz todos os dados em frases, sem números de eixo ou theta', () => {
    const bloco = montarBlocoAluno(DAVI, 'socratica');
    expect(bloco).toContain('## Sobre este aluno');
    expect(bloco).toContain('Davi, 17 anos, 3º ano');
    expect(bloco).toContain('Medicina (mira nota 850)');
    expect(bloco).toContain('visual, prático');
    expect(bloco).toContain('responde rápido e tende a errar por leitura apressada');
    expect(bloco).toContain('confiança média');
    expect(bloco).toContain('Matemática iniciante');
    expect(bloco).toContain('Função quadrática');
    expect(bloco).not.toMatch(/eixo/i);
    expect(bloco).not.toMatch(/theta/i);
  });

  it('destaca o nível da área em foco', () => {
    const bloco = montarBlocoAluno(DAVI, 'quiz', { areaFoco: 'matematica' });
    expect(bloco).toContain('Nível em Matemática (área desta atividade): iniciante');
    expect(bloco).toContain('Nível medido nas outras áreas: Ciências da Natureza intermediário');
  });

  it('aluno sem dados recebe bloco neutro explícito, nunca um perfil inventado', () => {
    const bloco = montarBlocoAluno(FATOS_VAZIOS, 'quiz', { areaFoco: 'humanas' });
    expect(bloco).toContain('Ainda não temos informações sobre este aluno');
    expect(bloco).toContain('Nível em Ciências Humanas: ainda não medido');
    expect(bloco).toContain('Não presuma um estilo');
    expect(bloco).not.toContain('Visual e Prático');
  });
});

describe('montarBlocoAluno — o mesmo fato vira instrução diferente por canal', () => {
  it('impulsivo: releitura no tutor, distrator no quiz, revisão na redação', () => {
    const socratica = montarBlocoAluno(DAVI, 'socratica');
    const quiz = montarBlocoAluno(DAVI, 'quiz', { areaFoco: 'matematica' });
    const redacao = montarBlocoAluno(DAVI, 'redacao');

    expect(socratica).toContain('releia o enunciado');
    expect(quiz).toContain('distrator que pune leitura apressada');
    expect(redacao).toContain('releitura final');
    expect(quiz).not.toContain('releia o enunciado');
  });

  it('nível iniciante calibra a dificuldade do quiz e o foco do feedback da redação', () => {
    const quiz = montarBlocoAluno(DAVI, 'quiz', { areaFoco: 'matematica' });
    const redacao = montarBlocoAluno({ ...DAVI, nivelPorArea: { redacao: 'iniciante' } }, 'redacao');
    expect(quiz).toContain('A dificuldade deve ser Fácil');
    expect(redacao).toContain('Concentre o feedback na competência com menor nota');
  });

  it('batalha só recebe o nível: sem nome, sem estilo, sem objetivo', () => {
    const bloco = montarBlocoAluno(DAVI, 'batalha', { areaFoco: 'matematica' });
    expect(bloco).toContain('Nível do aluno em Matemática: iniciante');
    expect(bloco).toContain('Questões de dificuldade fácil a média');
    expect(bloco).not.toContain('Davi');
    expect(bloco).not.toContain('visual');
    expect(bloco).not.toContain('Medicina');
  });

  it('trilha respeita o tempo disponível e as dificuldades declaradas', () => {
    const bloco = montarBlocoAluno(DAVI, 'trilha');
    expect(bloco).toContain('cerca de 30 minutos');
    expect(bloco).toContain('priorize Matemática, Redação');
  });

  it('estilo declarado e traço observado iguais não duplicam a instrução', () => {
    const fatos: FatosAluno = { ...FATOS_VAZIOS, estilosDeclarados: ['Visual'], tracosObservados: ['visual'], confiancaPerfil: 0.4 };
    const bloco = montarBlocoAluno(fatos, 'socratica');
    const ocorrencias = bloco.split('tabela, esquema ou lista numerada').length - 1;
    expect(ocorrencias).toBe(1);
  });
});

describe('prompts de canal — placeholders preenchidos', () => {
  it('socrático em modo json e texto compartilham regras e diferem no formato', () => {
    const bloco = montarBlocoAluno(DAVI, 'socratica');
    const json = montarPromptSocratico({ blocoAluno: bloco, modo: 'json' });
    const texto = montarPromptSocratico({ blocoAluno: bloco, modo: 'texto' });
    for (const p of [json, texto]) {
      expect(p).toContain('NUNCA entregue a resposta final');
      expect(p).toContain('Davi, 17 anos');
      expect(p).not.toContain('{{');
    }
    expect(json).toContain('"tipo": "guidance"');
    expect(texto).toContain('Responda em texto puro');
    expect(texto).not.toContain('"tipo": "guidance"');
  });

  it('quiz recebe área legível, tema, dificuldade e bloco', () => {
    const p = montarPromptQuiz({
      blocoAluno: montarBlocoAluno(DAVI, 'quiz', { areaFoco: 'matematica' }),
      area: 'Matemática',
      tema: 'porcentagem',
      instrucaoDificuldade: 'Média',
      instrucaoAntiRepeticao: '',
    });
    expect(p).toContain('área de Matemática');
    expect(p).toContain('Tema: porcentagem');
    expect(p).toContain('Dificuldade: Média');
    expect(p).not.toContain('{{');
  });

  it('corretor deixa explícito que a nota não é personalizada', () => {
    const p = montarPromptCorretorRedacao({ blocoAluno: montarBlocoAluno(DAVI, 'redacao') });
    expect(p).toContain('A nota não é personalizada');
    expect(p).toContain('C5 Proposta de intervenção');
    expect(p).not.toContain('{{');
  });
});

describe('normalização dos dados do banco', () => {
  it('tracosDoPerfil4D só afirma traço com confiança e acima do limiar', () => {
    const perfil = { eixoVisualVerbal: -0.5, eixoAnaliticoHolistico: 0.1, eixoSequencialAleatorio: 0.2, eixoReflexivoImpulsivo: 0.9 };
    expect(tracosDoPerfil4D(perfil, 0)).toEqual([]);
    expect(tracosDoPerfil4D(perfil, 0.3)).toEqual(['visual', 'global', 'impulsivo']);
  });

  it('niveisPorArea usa acurácia recente e ignora theta nunca calibrado', () => {
    const tentativas = [
      ...Array(6).fill({ area: 'matematica', acerto: false }),
      ...Array(2).fill({ area: 'matematica', acerto: true }),
      ...Array(3).fill({ area: 'humanas', acerto: true }), // < mínimo: não mede
    ];
    const habilidades = [
      { area: 'natureza', theta: '0', erroPadrao: '1' }, // default: nunca medido
      { area: 'linguagens', theta: '1.2', erroPadrao: '0.4' },
    ];
    expect(niveisPorArea(habilidades, tentativas)).toEqual({ matematica: 'iniciante', linguagens: 'avancado' });
  });

  it('temasErrados descarta marcadores internos e só conta erros', () => {
    const tentativas = [
      { acerto: false, temasErro: ['IA_ADAPTATIVA'] },
      { acerto: true, temasErro: ['Frações'] },
      { acerto: false, temasErro: ['Frações', 'Porcentagem'] },
      { acerto: false, temasErro: ['Frações'] },
    ];
    expect(temasErrados(tentativas)).toEqual(['Frações', 'Porcentagem']);
  });

  it('legivelObjetivo traduz o id do formulário e descarta "outro"', () => {
    expect(legivelObjetivo('medicina')).toBe('Medicina');
    expect(legivelObjetivo('outro')).toBeNull();
    expect(legivelObjetivo('Passar em Psicologia')).toBe('Passar em Psicologia');
  });
});

describe('temasDaTrilha — ordem de evidência', () => {
  it('erros recentes > área iniciante > dificuldade declarada > diagnóstico', () => {
    expect(temasDaTrilha(DAVI).origem).toBe('erros recentes em questões');
    expect(temasDaTrilha({ ...DAVI, temasErradosRecentes: [] }).lista).toEqual(['Matemática']);
    expect(temasDaTrilha({ ...DAVI, temasErradosRecentes: [], nivelPorArea: {} }).lista).toEqual(['Matemática', 'Redação']);
    const vazio = temasDaTrilha(FATOS_VAZIOS);
    expect(vazio.lista).toEqual([]);
    expect(vazio.texto).toContain('trilha de diagnóstico inicial');
    expect(vazio.texto).not.toContain('Temas variados');
  });
});
