// Rótulos compartilhados entre a prova e o relatório. Ficam fora do page.tsx
// porque o relatório também os usa para nomear áreas/dificuldades nos recortes.

export const AREA_LABEL: Record<string, string> = {
  linguagens: 'Linguagens',
  humanas: 'Ciências Humanas',
  natureza: 'Ciências da Natureza',
  matematica: 'Matemática',
};

export const AREA_ICONE: Record<string, string> = {
  linguagens: '📚',
  humanas: '🌍',
  natureza: '🔬',
  matematica: '📐',
};

export const DIFICULDADE_LABEL: Record<string, string> = {
  facil: 'Fácil',
  media: 'Média',
  dificil: 'Difícil',
};

export function rotuloArea(chave: string): string {
  return AREA_LABEL[chave] ?? chave;
}

export function rotuloDificuldade(chave: string): string {
  return DIFICULDADE_LABEL[chave] ?? chave;
}

/** Segundos → "1:29:59" ou "12:04". */
export function formatarDuracao(totalSegundos: number): string {
  const s = Math.max(0, Math.floor(totalSegundos));
  const horas = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  const segundos = s % 60;
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return horas > 0
    ? `${horas}:${doisDigitos(minutos)}:${doisDigitos(segundos)}`
    : `${minutos}:${doisDigitos(segundos)}`;
}
