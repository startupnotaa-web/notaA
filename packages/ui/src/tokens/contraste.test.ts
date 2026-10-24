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

// Ambientes da landing (tokens.json → ambientes): cada um tem paleta própria, e os pares de
// texto e fundo que a landing usa precisam passar 4,5:1 (3:1 para borda de campo e anel de foco).
interface GrupoAmbiente {
  id: string;
  tokens: { name: string; value: string }[];
}
const ambientes = (JSON.parse(readFileSync(join(__dirname, '../../tokens/tokens.json'), 'utf8')) as {
  ambientes: { groups: GrupoAmbiente[] };
}).ambientes.groups;

function corAmbiente(id: string, nome: string): string {
  const t = ambientes.find((g) => g.id === id)?.tokens.find((x) => x.name === `amb-${nome}`);
  if (!t || !t.value.startsWith('#')) throw new Error(`token de ambiente ausente ou derivado: ${id}/${nome}`);
  return t.value;
}

/** Cor `cima` com `parte` (0 a 1) de opacidade sobre `base`, como o navegador mistura. */
function misturar(cima: string, base: string, parte: number): string {
  const c = (hex: string) => [16, 8, 0].map((s) => (parseInt(hex.slice(1), 16) >> s) & 255);
  const [a, b] = [c(cima), c(base)];
  return `#${a.map((v, i) => Math.round(v * parte + b[i]! * (1 - parte)).toString(16).padStart(2, '0')).join('')}`;
}

const paresAmbiente: Record<string, { texto: string; fundos: string[]; minimo: number }[]> = {
  aluno: [
    { texto: 'ink', fundos: ['bg', 'bg-2'], minimo: 4.5 },
    { texto: 'ink-muted', fundos: ['bg', 'bg-2'], minimo: 4.5 },
    { texto: 'accent', fundos: ['bg', 'bg-2'], minimo: 4.5 },
    { texto: 'on-accent', fundos: ['accent', 'cyan', 'pink', 'sun'], minimo: 4.5 },
    { texto: 'focus', fundos: ['bg', 'bg-2'], minimo: 3 },
  ],
  professor: [
    { texto: 'ink', fundos: ['bg', 'surface', 'amber-tint'], minimo: 4.5 },
    { texto: 'ink-muted', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'accent', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'on-accent', fundos: ['accent', 'accent-hover'], minimo: 4.5 },
    { texto: 'amber', fundos: ['accent'], minimo: 3 },
    { texto: 'focus', fundos: ['bg', 'surface'], minimo: 3 },
    { texto: 'field-border', fundos: ['bg', 'surface'], minimo: 3 },
  ],
  escola: [
    { texto: 'ink', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'ink-muted', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'navy', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'accent', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'on-accent', fundos: ['accent', 'accent-hover'], minimo: 4.5 },
    { texto: 'on-navy', fundos: ['navy', 'navy-deep'], minimo: 4.5 },
    { texto: 'on-navy-muted', fundos: ['navy', 'navy-deep'], minimo: 4.5 },
    { texto: 'accent-light', fundos: ['navy', 'navy-deep'], minimo: 3 },
    { texto: 'focus', fundos: ['bg', 'surface'], minimo: 3 },
    { texto: 'field-border', fundos: ['bg', 'surface'], minimo: 3 },
  ],
  faculdade: [
    { texto: 'ink', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'ink-muted', fundos: ['bg', 'surface'], minimo: 4.5 },
    { texto: 'accent', fundos: ['bg', 'surface', 'accent-tint'], minimo: 4.5 },
    { texto: 'on-accent', fundos: ['accent', 'accent-hover'], minimo: 4.5 },
    { texto: 'on-ink', fundos: ['ink'], minimo: 4.5 },
    { texto: 'on-ink-muted', fundos: ['ink'], minimo: 4.5 },
    { texto: 'focus', fundos: ['bg', 'surface'], minimo: 3 },
    { texto: 'field-border', fundos: ['bg', 'surface'], minimo: 3 },
  ],
};

describe.each(Object.entries(paresAmbiente))('contraste do ambiente %s', (id, lista) => {
  for (const { texto, fundos, minimo } of lista) {
    for (const fundo of fundos) {
      it(`${texto} sobre ${fundo} passa ${minimo}:1`, () => {
        expect(razao(corAmbiente(id, texto), corAmbiente(id, fundo))).toBeGreaterThanOrEqual(minimo);
      });
    }
  }
});

describe('cartões da home: texto branco sobre o degradê de cada ambiente', () => {
  const BRANCO = cor('surface', 'light'); // branco do tema claro
  for (const { id } of ambientes) {
    for (const ponta of ['card-from', 'card-to', 'tag']) {
      it(`${id}: branco sobre ${ponta} passa 4,5:1`, () => {
        expect(razao(BRANCO, corAmbiente(id, ponta))).toBeGreaterThanOrEqual(4.5);
      });
    }
    // A etiqueta (chip) do cartão é o fim do degradê a 55% por cima do começo, e não branco translúcido:
    // branco a 18% sobre o degradê do aluno, do professor e da escola ficava abaixo de 4,5:1.
    it(`${id}: a etiqueta (fim do degradê a 55% sobre o começo) passa 4,5:1`, () => {
      const fundo = misturar(corAmbiente(id, 'card-to'), corAmbiente(id, 'card-from'), 0.55);
      expect(razao(BRANCO, fundo)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
