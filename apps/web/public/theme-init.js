// Aplica o tema guardado antes da pintura, para não piscar o tema errado.
// Arquivo estático (e não script inline) para a CSP das páginas públicas não precisar de 'unsafe-inline'.
// A chave é a mesma de lib/storage-keys.ts (THEME_STORAGE_KEY); se uma mudar, mude a outra.
/* global localStorage, matchMedia, document */
try {
  var t = localStorage.getItem('notaa:tema');
  if (t === 'system') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
} catch {
  // Sem armazenamento (modo privado, bloqueio): vale o tema claro, que é o padrão.
}
