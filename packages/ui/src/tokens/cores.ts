// Valores de cor do tokens.json para o código que não aceita var(): manifest,
// themeColor e a geração de ícones. Em CSS e Tailwind use sempre a variável.
import tokens from '../../tokens/tokens.json';

export type Tema = 'light' | 'dark';

export function corDoToken(nome: string, tema: Tema = 'light'): string {
  const token = tokens.color.tokens.find((t) => t.name === nome);
  if (!token) throw new Error(`Token de cor desconhecido: ${nome}`);
  return token.value[tema];
}
