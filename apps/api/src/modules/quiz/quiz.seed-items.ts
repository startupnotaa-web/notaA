import type { BancoDeItemRegistro } from '@notaa/contracts';

/**
 * ⚠️ Itens de DESENVOLVIMENTO/TESTE — não são o banco de itens oficial.
 *
 * Parâmetros TRI (a/b/c) são ilustrativos para exercitar a seleção adaptativa
 * e a atualização de θ de ponta a ponta nesta fatia vertical. O banco real
 * (origem dos itens + calibração) é pendência explícita Q-02 (docs/01 §8) —
 * todo item aqui é `naoCalibrado: true`, como deve ser até validação por
 * especialista (I11, doc 04 §4).
 */
export const ITENS_SEED: BancoDeItemRegistro[] = [
  {
    itemId: 'c0b89f89-8d76-4d05-b1a7-09d10e8b15d0',
    area: 'matematica',
    competencia: 'Matemática Básica',
    paramA: 0.8,
    paramB: -1,
    paramC: 0.2,
    enunciado: 'Quanto é 12 + 7?',
    alternativas: [
      { id: 'a', texto: '17' },
      { id: 'b', texto: '19' },
      { id: 'c', texto: '21' },
      { id: 'd', texto: '23' },
    ],
    gabarito: 'b',
    naoCalibrado: true,
  },
  {
    itemId: '00000000-0000-0000-0000-000000000002',
    area: 'matematica',
    competencia: 'Álgebra Básica',
    paramA: 1.2,
    paramB: 0,
    paramC: 0.2,
    enunciado: 'Qual o valor de x na equação 2x + 4 = 10?',
    alternativas: [
      { id: 'a', texto: '2' },
      { id: 'b', texto: '3' },
      { id: 'c', texto: '4' },
      { id: 'd', texto: '5' },
    ],
    gabarito: 'b',
    naoCalibrado: true,
  },
  {
    itemId: '00000000-0000-0000-0000-000000000003',
    area: 'matematica',
    competencia: 'Cálculo Diferencial',
    paramA: 1.5,
    paramB: 1,
    paramC: 0.2,
    enunciado: 'Qual é a derivada de f(x) = x²?',
    alternativas: [
      { id: 'a', texto: 'x' },
      { id: 'b', texto: '2x' },
      { id: 'c', texto: 'x²' },
      { id: 'd', texto: '2' },
    ],
    gabarito: 'b',
    naoCalibrado: true,
  },
  {
    itemId: '00000000-0000-0000-0000-000000000004',
    area: 'matematica',
    competencia: 'Logaritmos',
    paramA: 1.8,
    paramB: 2,
    paramC: 0.2,
    enunciado: 'Qual é o valor de log₂(8)?',
    alternativas: [
      { id: 'a', texto: '2' },
      { id: 'b', texto: '3' },
      { id: 'c', texto: '4' },
      { id: 'd', texto: '8' },
    ],
    gabarito: 'b',
    naoCalibrado: true,
  },
  {
    itemId: '11223344-5566-7788-9900-aabbccddeeff',
    area: 'linguagens',
    competencia: 'Interpretação de Texto',
    paramA: 1,
    paramB: 0,
    paramC: 0.25,
    enunciado: 'Qual figura de linguagem está em "o tempo é um rio que corre sem parar"?',
    alternativas: [
      { id: 'a', texto: 'Metáfora' },
      { id: 'b', texto: 'Hipérbole' },
      { id: 'c', texto: 'Ironia' },
      { id: 'd', texto: 'Eufemismo' },
    ],
    gabarito: 'a',
    naoCalibrado: true,
  },
];
