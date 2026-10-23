import type { EstiloDoFormulario } from './FormularioLead';

/**
 * Classes compartilhadas das páginas públicas. Cada ambiente tem a sua roupa (botão, campo, selo), todas feitas
 * só com utilitários e tokens: as cores `amb-*` valem dentro de `data-ambiente`; a home usa os tokens do sistema.
 */

/** Foco visível em 3px, com a cor de foco do ambiente (ou a do sistema, na home). */
export const FOCO =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--amb-focus,var(--focus))]';

/** Alvo de 52px (≥ 44), sem sublinhado, com resposta rápida ao ponteiro. Quem usa acrescenta forma e cor. */
const BOTAO = `inline-flex min-h-[52px] items-center justify-center px-7 font-text text-body font-bold no-underline transition-[transform,box-shadow,background-color,color] duration-fast ease-out motion-reduce:transition-none ${FOCO}`;

export const BOTAO_HOME = {
  primario: `${BOTAO} rounded-pill bg-primary text-primary-on shadow-raise hover:-translate-y-0.5 hover:bg-primary-hover`,
  secundario: `${BOTAO} rounded-pill border-[1.5px] border-line-strong bg-surface text-ink hover:-translate-y-0.5 hover:shadow-raise`,
  compacto: 'min-h-[46px] px-[22px]',
};

export const BOTAO_ALUNO = {
  primario: `${BOTAO} rounded-[18px] bg-amb-accent font-pesada font-extrabold text-amb-on-accent shadow-[0_6px_0_var(--amb-accent-edge)] hover:-translate-y-0.5 hover:shadow-[0_8px_0_var(--amb-accent-edge)] active:translate-y-[5px] active:shadow-[0_1px_0_var(--amb-accent-edge)]`,
  contorno: `${BOTAO} rounded-[18px] border-2 border-amb-ink font-pesada font-extrabold text-amb-ink hover:-translate-y-0.5`,
  escuro: `${BOTAO} rounded-[18px] bg-amb-on-accent font-pesada font-extrabold text-amb-ink shadow-[0_6px_0_var(--amb-bg-deep)] hover:-translate-y-0.5 active:translate-y-[5px] active:shadow-[0_1px_0_var(--amb-bg-deep)]`,
  compacto: 'min-h-[46px] px-[22px] text-[15px]',
};

export const BOTAO_PROFESSOR = {
  primario: `${BOTAO} rounded-md border-[1.5px] border-transparent bg-amb-accent text-amb-on-accent hover:-translate-y-px hover:bg-amb-accent-hover`,
  contorno: `${BOTAO} rounded-md border-[1.5px] border-amb-accent text-amb-accent hover:bg-amb-amber-tint`,
  compacto: 'min-h-[46px] px-5',
};

export const BOTAO_ESCOLA = {
  branco: `${BOTAO} rounded-sm bg-amb-surface text-amb-navy hover:-translate-y-px hover:bg-amb-accent-tint`,
  azul: `${BOTAO} rounded-sm bg-amb-accent text-amb-on-accent hover:-translate-y-px hover:bg-amb-accent-hover`,
  contorno: `${BOTAO} rounded-sm border-[1.5px] border-amb-on-navy text-amb-on-navy hover:bg-[color-mix(in_srgb,var(--amb-accent-light)_20%,transparent)]`,
  compacto: 'min-h-[46px] px-5',
};

export const BOTAO_FACULDADE = {
  primario: `${BOTAO} rounded-[4px] bg-amb-accent text-amb-on-accent hover:bg-amb-accent-hover`,
  contorno: `${BOTAO} rounded-[4px] border-[1.5px] border-amb-ink text-amb-ink hover:bg-[color-mix(in_srgb,var(--amb-ink)_8%,transparent)]`,
  compacto: 'min-h-[46px] px-5',
};

const CAMPO = (borda: string, raio: string) =>
  `min-h-[52px] w-full ${raio} border-[1.5px] ${borda} bg-amb-surface px-4 font-text text-[17px] leading-6 text-amb-ink transition-colors duration-fast ease-out motion-reduce:transition-none placeholder:text-amb-ink-muted ${FOCO} aria-[invalid=true]:border-danger aria-[invalid=true]:border-2`;

const ERRO = 'font-text text-body-sm font-bold text-danger';

export const FORM_HOME: EstiloDoFormulario = {
  formulario: 'relative flex flex-1 basis-[380px] flex-col gap-4 rounded-lg bg-surface p-7 text-ink',
  rotulo: 'font-text text-label font-bold text-ink',
  controle: `min-h-[52px] w-full rounded-md border-[1.5px] border-line-strong bg-surface px-4 font-text text-[17px] leading-6 text-ink ${FOCO} aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger`,
  erro: ERRO,
  botao: `${BOTAO_HOME.primario} disabled:opacity-60`,
  consentimento: 'flex min-h-[44px] items-start gap-3 font-text text-body-sm text-ink',
  link: `rounded-sm font-bold text-primary underline underline-offset-4 ${FOCO}`,
  sucesso: 'text-ink',
};

export const FORM_ESCOLA: EstiloDoFormulario = {
  formulario: 'relative flex flex-1 basis-[360px] flex-col gap-4 rounded-md bg-amb-surface p-7 text-amb-ink',
  rotulo: 'font-text text-label font-bold text-amb-ink',
  controle: CAMPO('border-amb-field-border', 'rounded-sm'),
  erro: ERRO,
  botao: `${BOTAO_ESCOLA.azul} disabled:opacity-60`,
  consentimento: 'flex min-h-[44px] items-start gap-3 font-text text-body-sm text-amb-ink',
  link: `rounded-sm font-bold text-amb-accent underline underline-offset-4 ${FOCO}`,
  sucesso: 'text-amb-ink',
};

export const FORM_FACULDADE: EstiloDoFormulario = {
  formulario: 'relative flex flex-1 basis-[360px] flex-col gap-4 bg-amb-surface p-7 text-amb-ink',
  rotulo: 'font-text text-label font-bold text-amb-ink',
  controle: CAMPO('border-amb-field-border', 'rounded-[4px]'),
  erro: ERRO,
  botao: `${BOTAO_FACULDADE.primario} disabled:opacity-60`,
  consentimento: 'flex min-h-[44px] items-start gap-3 font-text text-body-sm text-amb-ink',
  link: `font-bold text-amb-accent underline underline-offset-4 ${FOCO}`,
  sucesso: 'text-amb-ink',
};
