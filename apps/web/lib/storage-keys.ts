// Chaves de localStorage compartilhadas entre módulos client-side. Módulo sem
// dependências de propósito — user-context e auth-context importam daqui sem
// criar ciclo entre si.
export const USER_STATE_STORAGE_KEY = 'notaa:user-state:v1';
// Tema escolhido pela pessoa ('light' | 'dark' | 'system'). Lido antes da pintura por um
// script inline em app/layout.tsx; sem valor, vale o claro.
export const THEME_STORAGE_KEY = 'notaa:tema';
