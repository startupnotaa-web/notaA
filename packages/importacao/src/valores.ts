import { z } from 'zod';
import type { MapeamentoColunas } from '@notaa/contracts';

const EmailSchema = z.string().email();

/**
 * Valor de um campo numa linha, já sem espaços nas pontas. Tira o apóstrofo que
 * a exportação põe na frente de `= + - @` (proteção contra fórmula), para que
 * exportar e reimportar devolva o mesmo valor.
 */
export function celula(celulas: string[], mapeamento: MapeamentoColunas, campo: string): string {
  const coluna = mapeamento[campo];
  if (coluna === null || coluna === undefined) return '';
  const valor = (celulas[coluna] ?? '').trim();
  return /^'[=+\-@\t\r]/.test(valor) ? valor.slice(1) : valor;
}

export function emailValido(email: string): boolean {
  return email.length <= 254 && EmailSchema.safeParse(email).success;
}

/** Aceita dd/mm/aaaa, d/m/aaaa e aaaa-mm-dd. Devolve aaaa-mm-dd, ou null se inválida. */
export function normalizarData(valor: string): string | null {
  let ano: number;
  let mes: number;
  let dia: number;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (br) {
    dia = Number(br[1]);
    mes = Number(br[2]);
    ano = Number(br[3]);
  } else if (iso) {
    ano = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else {
    return null;
  }
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  if (ano < 1900 || d.getTime() > Date.now()) return null;
  return d.toISOString().slice(0, 10);
}

export function telefoneValido(telefone: string): boolean {
  return /^[0-9+()\s.-]{8,30}$/.test(telefone);
}
