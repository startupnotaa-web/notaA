import { describe, expect, it } from 'vitest';
import { RegraAvaliativaSchema, SimularRegraRequestSchema } from '../regra-avaliativa';

function regraValida() {
  return {
    regime: { tipo: 'bimestral' },
    escala: { tipo: 'numerica', maximo: 10 },
    notaPeriodo: { tipo: 'media_aritmetica' },
    mediaFinal: { pesosPorPeriodo: [2, 2, 3, 3] },
    arredondamento: { tipo: 'normal', casas: 1 },
    recuperacao: {
      paralela: { modo: 'maior' },
      final: { modo: 'media', mediaMinimaParaAcesso: 3, mediaMinimaAposRecuperacao: 5 },
    },
    aprovacao: { mediaMinima: 6, frequenciaMinima: 0.75 },
    conselhoDeClasse: { habilitado: true, margemMaxima: 0.5 },
  };
}

function mensagens(resultado: ReturnType<typeof RegraAvaliativaSchema.safeParse>): string[] {
  return resultado.success ? [] : resultado.error.issues.map((i) => i.message);
}

describe('RegraAvaliativaSchema', () => {
  it('aceita uma regra completa', () => {
    expect(RegraAvaliativaSchema.safeParse(regraValida()).success).toBe(true);
  });

  it.each([0.7, 0.5, 0, 0.749])('recusa frequência mínima %s, abaixo de 75%%', (frequenciaMinima) => {
    const r = { ...regraValida(), aprovacao: { mediaMinima: 6, frequenciaMinima } };
    const resultado = RegraAvaliativaSchema.safeParse(r);
    expect(resultado.success).toBe(false);
    expect(mensagens(resultado)).toContain('A frequência mínima não pode ser menor que 75%.');
  });

  it.each([0.75, 0.8, 1])('aceita frequência mínima %s', (frequenciaMinima) => {
    const r = { ...regraValida(), aprovacao: { mediaMinima: 6, frequenciaMinima } };
    expect(RegraAvaliativaSchema.safeParse(r).success).toBe(true);
  });

  it('recusa pesos em número diferente do de períodos', () => {
    const r = { ...regraValida(), regime: { tipo: 'trimestral' } };
    expect(mensagens(RegraAvaliativaSchema.safeParse(r))).toContain('Informe 3 pesos, um por período.');
  });

  it('recusa média mínima acima do máximo da escala', () => {
    const r = { ...regraValida(), aprovacao: { mediaMinima: 60, frequenciaMinima: 0.75 } };
    expect(mensagens(RegraAvaliativaSchema.safeParse(r))).toContain('Não pode passar de 10.');
  });

  it('recusa acesso à final igual ou acima da média de aprovação', () => {
    const r = regraValida();
    r.recuperacao.final.mediaMinimaParaAcesso = 6;
    expect(RegraAvaliativaSchema.safeParse(r).success).toBe(false);
  });

  it('recusa tipo de regime desconhecido', () => {
    const r = { ...regraValida(), regime: { tipo: 'quadrimestral' } };
    expect(RegraAvaliativaSchema.safeParse(r).success).toBe(false);
  });

  describe('escala de conceitos', () => {
    const faixas = [
      { conceito: 'C', min: 0, max: 5, valor: 3 },
      { conceito: 'B', min: 5, max: 8, valor: 6.5 },
      { conceito: 'A', min: 8, max: 10, valor: 9 },
    ];
    const comFaixas = (f: typeof faixas) => ({
      ...regraValida(),
      escala: { tipo: 'conceitos', maximo: 10, faixas: f },
    });

    it('aceita faixas contíguas cobrindo a escala', () => {
      expect(RegraAvaliativaSchema.safeParse(comFaixas(faixas)).success).toBe(true);
    });

    it('recusa buraco entre faixas', () => {
      const comBuraco = faixas.map((f) => (f.conceito === 'B' ? { ...f, min: 5.5 } : f));
      expect(RegraAvaliativaSchema.safeParse(comFaixas(comBuraco)).success).toBe(false);
    });

    it('recusa faixas que não chegam ao máximo', () => {
      const curta = faixas.map((f) => (f.conceito === 'A' ? { ...f, max: 9.5 } : f));
      expect(RegraAvaliativaSchema.safeParse(comFaixas(curta)).success).toBe(false);
    });

    it('recusa conceito repetido', () => {
      const repetido = faixas.map((f) => (f.conceito === 'A' ? { ...f, conceito: 'b' } : f));
      expect(RegraAvaliativaSchema.safeParse(comFaixas(repetido)).success).toBe(false);
    });

    it('recusa valor fora da faixa', () => {
      const fora = faixas.map((f) => (f.conceito === 'A' ? { ...f, valor: 7 } : f));
      expect(RegraAvaliativaSchema.safeParse(comFaixas(fora)).success).toBe(false);
    });
  });
});

describe('SimularRegraRequestSchema', () => {
  it('limita a 20 alunos de exemplo', () => {
    const aluno = { notasPorPeriodo: [[6], [7], [8], [9]], frequencia: 0.9 };
    const corpo = { regra: regraValida(), alunos: Array.from({ length: 21 }, () => aluno) };
    expect(SimularRegraRequestSchema.safeParse(corpo).success).toBe(false);
  });
});
