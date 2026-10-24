import type { MetadataRoute } from 'next';
import { corDoToken } from '@notaa/ui';

// O manifest sai do código para ler as cores de tokens.json em vez de repeti-las.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nota A',
    short_name: 'Nota A',
    description: 'Aprenda jogando. Evolua estudando. Preparação para o ENEM com IA adaptativa.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: corDoToken('paper'),
    theme_color: corDoToken('paper'),
    lang: 'pt-BR',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/maskable-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
