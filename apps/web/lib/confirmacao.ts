import { caminhoInternoSeguro } from './destino';

/**
 * Destino da confirmação de e-mail quando o token ainda não traz papel. O `next` vem da URL, que
 * qualquer pessoa pode montar: só vale se for caminho interno. Qualquer outra coisa cai na
 * onboarding.
 */
export function destinoSemPapelAposConfirmar(next: string | null | undefined): string {
  return caminhoInternoSeguro(next) ?? '/onboarding';
}
