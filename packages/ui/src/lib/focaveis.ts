const SELETOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Elementos que recebem foco por Tab dentro de `raiz`, na ordem do documento. */
export function focaveisEm(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(SELETOR)).filter((el) => !el.hasAttribute('hidden'));
}
