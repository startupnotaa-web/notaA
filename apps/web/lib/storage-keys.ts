// Chaves de localStorage compartilhadas entre módulos client-side. Módulo sem
// dependências de propósito — user-context e auth-context importam daqui sem
// criar ciclo entre si.
export const USER_STATE_STORAGE_KEY = 'notaa:user-state:v1';
// Tema escolhido pela pessoa ('light' | 'dark' | 'system'). Lido antes da pintura por um
// script inline em app/layout.tsx; sem valor, vale o claro.
export const THEME_STORAGE_KEY = 'notaa:tema';
// Barra lateral recolhida ('1') ou expandida (ausente). Só vale a partir de 1.024px.
export const NAV_RECOLHIDA_STORAGE_KEY = 'notaa:nav-recolhida';
// Contexto de trabalho do painel: ano letivo e turma escolhidos na barra superior.
export const CONTEXTO_STORAGE_KEY = 'notaa:contexto:v1';
// Último contexto de acesso escolhido em "Entrar como…" ({ authUid, contexto }). É só uma dica de
// interface: o servidor valida o contexto a cada requisição e ignora o que não for da conta.
export const ACESSO_STORAGE_KEY = 'notaa:acesso:v1';
