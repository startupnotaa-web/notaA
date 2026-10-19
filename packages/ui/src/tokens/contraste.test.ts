// Confere, a partir de tokens.json, os pares de cor que o README do handoff promete:
// 4,5:1 para texto e 3:1 para bordas de controle e anel de foco, nos dois temas.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Token {
  name: string;
  value: { light: string; dark: string };
}

const json = JSON.parse(readFileSync(join(__dirname, '../../tokens/tokens.json'), 'utf8')) as {
  color: { tokens: Token[] };
};

type Tema = 'light' | 'dark';

function cor(nome: string, tema: Tema): string {
  const t = json.color.tokens.find((x) => x.name === nome);
  if (!t) throw new Error(`token ausente: ${nome}`);
  return t.value[tema];
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0]! + 0.7152 * canais[1]! + 0.0722 * canais[2]!;
}

function razao(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const FUNDOS_NEUTROS = ['paper', 'surface', 'surface-sunken'];
const TINTS = ['violet-tint', 'cyan-tint', 'success-tint', 'warning-tint', 'danger-tint'];

const pares: { texto: string; fundos: string[]; minimo: number }[] = [
  { texto: 'ink', fundos: [...FUNDOS_NEUTROS, ...TINTS], minimo: 4.5 },
  { texto: 'ink-muted', fundos: [...FUNDOS_NEUTROS, ...TINTS], minimo: 4.5 },
  { texto: 'primary', fundos: ['paper', 'surface', 'surface-sunken', 'violet-tint'], minimo: 4.5 },
  { texto: 'on-primary', fundos: ['primary', 'primary-hover'], minimo: 4.5 },
  { texto: 'info', fundos: [...FUNDOS_NEUTROS, 'cyan-tint'], minimo: 4.5 },
  { texto: 'success', fundos: [...FUNDOS_NEUTROS, 'success-tint'], minimo: 4.5 },
  { texto: 'warning', fundos: [...FUNDOS_NEUTROS, 'warning-tint'], minimo: 4.5 },
  { texto: 'danger', fundos: [...FUNDOS_NEUTROS, 'danger-tint'], minimo: 4.5 },
  { texto: 'line-strong', fundos: FUNDOS_NEUTROS, minimo: 3 },
  { texto: 'focus', fundos: FUNDOS_NEUTROS, minimo: 3 },
];

describe.each<Tema>(['light', 'dark'])('contraste dos tokens no tema %s', (tema) => {
  for (const { texto, fundos, minimo } of pares) {
    for (const fundo of fundos) {
      it(`${texto} sobre ${fundo} passa ${minimo}:1`, () => {
        expect(razao(cor(texto, tema), cor(fundo, tema))).toBeGreaterThanOrEqual(minimo);
      });
    }
  }
});
