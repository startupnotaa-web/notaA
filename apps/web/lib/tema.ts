import { THEME_STORAGE_KEY } from './storage-keys';

export type PreferenciaDeTema = 'light' | 'dark' | 'system';

/** Preferência guardada. Sem valor (ou se o armazenamento estiver bloqueado), vale o claro: é o padrão absoluto. */
export function lerPreferenciaDeTema(): PreferenciaDeTema {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

/** Guarda a preferência e aplica o data-theme na hora; o script de app/layout.tsx faz o mesmo antes da pintura. */
export function aplicarPreferenciaDeTema(preferencia: PreferenciaDeTema): void {
  try {
    if (preferencia === 'light') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preferencia);
  } catch {
    // Sem armazenamento a escolha vale só nesta visita.
  }
  const escuro = preferencia === 'dark' || (preferencia === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
}
