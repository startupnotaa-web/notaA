import { randomInt } from 'node:crypto';

/**
 * Alfabeto do código de convite. Sem os pares que a pessoa confunde ao copiar de
 * um quadro ou de um papel: O e 0, I e 1, S e 5, Z e 2. O código é ditado em
 * sala de aula, então legibilidade vale mais que entropia máxima.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXY34689';

export const TAMANHO_CODIGO_CONVITE = 6;

/**
 * Gera um código de convite. Usa `randomInt` do módulo de criptografia, e não
 * `Math.random`: o código é a única credencial para entrar numa turma, e um
 * gerador previsível permitiria adivinhar convites de outras turmas.
 *
 * O espaço é de 27^6, cerca de 387 milhões de combinações. Unicidade é garantida
 * pelo banco (`turma.codigo_convite` é unique); em colisão, quem chama tenta de
 * novo.
 */
export function gerarCodigoConvite(): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO_CONVITE; i += 1) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}

/**
 * Normaliza o que o aluno digitou: maiúsculas e sem espaços. Ele vai copiar do
 * quadro, do WhatsApp ou de um papel, e "abc 123" precisa chegar como "ABC123".
 */
export function normalizarCodigoConvite(entrada: string): string {
  return entrada.replace(/\s+/g, '').toUpperCase();
}
