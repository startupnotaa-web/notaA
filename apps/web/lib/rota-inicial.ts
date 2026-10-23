import { HOME_POR_PAPEL, papelConhecido } from './destino';

/**
 * Home de cada papel depois de entrar. O mapa mora em `destino.ts`; este arquivo só mantém os dois
 * nomes que o resto do app já usa.
 *
 * Papel desconhecido ou ausente NÃO cai mais no hub do aluno: volta ao login. Era esse padrão que
 * mandava professor e instituição para `/dashboard` sempre que o papel não chegava a tempo.
 */
export function rotaInicialPorPapel(papel: string | null | undefined): string {
  const conhecido = papelConhecido(papel);
  return conhecido ? HOME_POR_PAPEL[conhecido] : '/login';
}

/**
 * Destino logo depois do PRIMEIRO registro (confirmação de e-mail, cadastro, primeiro login OAuth).
 * Igual ao de cima, exceto o aluno, que ainda precisa passar pelo onboarding. Sem papel, a conta é
 * nova e vai para o onboarding (o sync-oauth cria como estudante). O papel tem que vir do token JÁ
 * renovado pelo `garantirRegistro` — antes dele o token não tem `papel`.
 */
export function rotaPosRegistro(papel: string | null | undefined): string {
  if (!papel || papel === 'estudante') return '/onboarding';
  return rotaInicialPorPapel(papel);
}
