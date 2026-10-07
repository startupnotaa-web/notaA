/**
 * Para onde cada papel vai depois de entrar.
 *
 * Antes TODO login ia para `/dashboard`, que é o hub do aluno. Isso tinha duas
 * consequências ruins: o admin de instituição caía numa tela de gamificação que
 * não é dele, e o professor não tinha caminho nenhum até o próprio painel — a
 * rota existia, mas nenhum link no app levava até ela, só digitar a URL.
 *
 * Função pura e num arquivo só porque o destino é decidido em três lugares
 * diferentes: o redirecionamento do contexto de autenticação, a tela de login e
 * o pós-cadastro.
 */
export function rotaInicialPorPapel(papel: string | null | undefined): string {
  switch (papel) {
    case 'admin_instituicao':
      return '/instituicao';
    case 'professor_institucional':
    case 'professor_independente':
      return '/professor';
    default:
      // Estudante, responsável e admin da plataforma seguem no hub do aluno.
      return '/dashboard';
  }
}

/**
 * Destino logo depois do PRIMEIRO registro (confirmação de e-mail, cadastro,
 * primeiro login OAuth). Igual ao de cima, exceto o aluno, que ainda precisa
 * passar pelo onboarding. O papel tem que vir do token JÁ renovado pelo
 * `garantirRegistro` — antes dele o token não tem `papel`.
 */
export function rotaPosRegistro(papel: string | null | undefined): string {
  if (!papel || papel === 'estudante') return '/onboarding';
  return rotaInicialPorPapel(papel);
}
