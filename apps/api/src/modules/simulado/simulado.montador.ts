import type { AreaConhecimento, DificuldadeTri } from '@notaa/contracts';

/**
 * Composição de dificuldade de cada bloco de 10 questões — espelha a intenção
 * de um simulado real: começa acessível, aprofunda no meio, cobra no fim.
 */
export const COMPOSICAO_POR_AREA: Record<DificuldadeTri, number> = {
  facil: 3,
  media: 4,
  dificil: 3,
};

/** Alternativas em A..E, mesma convenção do quiz. */
export const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * O banco público não cobre as 4 áreas por igual (matemática tem ~7 questões
 * aproveitáveis). Quando falta, a IA completa — por isso cada questão carrega
 * sua `origem` e o relatório informa a proporção ao aluno.
 */
export interface PlanoQuestao {
  area: AreaConhecimento;
  dificuldade: DificuldadeTri;
}

/** Plano de prova: o que precisa existir, antes de saber de onde virá. */
export function montarPlano(areas: readonly AreaConhecimento[]): PlanoQuestao[] {
  const plano: PlanoQuestao[] = [];
  for (const area of areas) {
    for (const [dificuldade, quantidade] of Object.entries(COMPOSICAO_POR_AREA)) {
      for (let i = 0; i < quantidade; i++) {
        plano.push({ area, dificuldade: dificuldade as DificuldadeTri });
      }
    }
  }
  return plano;
}

const PESO_DIFICULDADE: Record<DificuldadeTri, number> = { facil: 0, media: 1, dificil: 2 };

/**
 * Intercala as áreas em vez de agrupar (10 de linguagens, depois 10 de
 * humanas...). Alternar reduz fadiga e aproxima da sensação de prova real.
 *
 * Cada fila é reordenada por dificuldade antes do rodízio. Sem isso, as
 * questões que a IA completou — que chegam no fim da lista — caem no trecho
 * final da prova independentemente do nível: matemática abria uma questão
 * FÁCIL na posição 32, enquanto as outras três áreas já estavam em difícil.
 */
export function intercalarPorArea<
  T extends { area: AreaConhecimento; dificuldade: DificuldadeTri },
>(itens: T[]): T[] {
  const filas = new Map<AreaConhecimento, T[]>();
  for (const item of itens) {
    const fila = filas.get(item.area) ?? [];
    fila.push(item);
    filas.set(item.area, fila);
  }
  for (const fila of filas.values()) {
    fila.sort((a, b) => PESO_DIFICULDADE[a.dificuldade] - PESO_DIFICULDADE[b.dificuldade]);
  }
  const saida: T[] = [];
  while (saida.length < itens.length) {
    for (const fila of filas.values()) {
      const proximo = fila.shift();
      if (proximo) saida.push(proximo);
    }
  }
  return saida;
}

// ── XP ────────────────────────────────────────────────────────────────────
// Menos tempo = mais recompensa. O modo livre paga pouco e só acima de 70%,
// para não competir com o cronometrado.

export const XP_BASE_POR_ACERTO = 10;
export const MULTIPLICADOR: Record<string, number> = { '60': 1.5, '90': 1.25, livre: 0.4 };
export const LIVRE_ACERTO_MINIMO = 0.7;

export function calcularXp(input: {
  acertos: number;
  total: number;
  modo: 'cronometrado' | 'livre';
  limiteMinutos: number | null;
}): { xp: number; bloqueadoPorDesempenho: boolean } {
  const base = input.acertos * XP_BASE_POR_ACERTO;
  if (input.modo === 'livre') {
    const percentual = input.total > 0 ? input.acertos / input.total : 0;
    if (percentual <= LIVRE_ACERTO_MINIMO) return { xp: 0, bloqueadoPorDesempenho: true };
    return { xp: Math.round(base * MULTIPLICADOR.livre!), bloqueadoPorDesempenho: false };
  }
  const fator = MULTIPLICADOR[String(input.limiteMinutos)] ?? 1;
  return { xp: Math.round(base * fator), bloqueadoPorDesempenho: false };
}
