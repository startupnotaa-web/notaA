// docs/07 — util de classes (estilo clsx, sem dependência externa).
// Junta classes truthy com espaço; ignora false/null/undefined.

export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>
  | ClassValue[];

function toVal(input: ClassValue): string {
  if (input === null || input === undefined || input === false) return '';
  if (typeof input === 'string' || typeof input === 'number') return String(input);
  if (Array.isArray(input)) {
    let out = '';
    for (const item of input) {
      const v = toVal(item);
      if (v) out += (out && ' ') + v;
    }
    return out;
  }
  // Record<string, boolean>
  let out = '';
  for (const key in input) {
    if (input[key]) out += (out && ' ') + key;
  }
  return out;
}

/** Concatena classes condicionais (string | number | array | objeto) numa única string. */
export function cn(...inputs: ClassValue[]): string {
  let out = '';
  for (const input of inputs) {
    const v = toVal(input);
    if (v) out += (out && ' ') + v;
  }
  return out;
}
