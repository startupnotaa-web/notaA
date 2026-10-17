import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, Sora } from 'next/font/google';
import type { ReactNode } from 'react';
import { corDoToken } from '@notaa/ui';
import { AuthProvider } from '../lib/auth-context';
import { THEME_STORAGE_KEY } from '../lib/storage-keys';
import { ErrorSuppressor } from './components/ErrorSuppressor';
import './globals.css';

// Sora (títulos, números e marca) e Atkinson Hyperlegible Next (texto e interface)
// vêm por next/font, sem @import. Cada uma expõe uma variável própria, que
// tokens.css coloca na frente da pilha de --font-display e --font-text.
const sora = Sora({ subsets: ['latin'], weight: ['500', '600'], display: 'swap', variable: '--nf-sora' });
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--nf-atkinson',
  // O Next ainda não tem as métricas dessa fonte para ajustar o fallback.
  adjustFontFallback: false,
});

// Claro é o padrão (docs/07-design-system.md); o escuro é opcional por data-theme
// em <html>. Este script roda antes da pintura para aplicar a escolha guardada e
// evitar o flash do tema errado. O conteúdo é constante, sem dado de usuário.
const TEMA_ANTES_DA_PINTURA = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: 'Nota A — Aprenda jogando. Evolua estudando.',
  description:
    'Plataforma gamificada de preparação para o ENEM com IA adaptativa e personalização inclusiva.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/brand/favicon.ico',
    apple: '/brand/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: corDoToken('paper'),
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      className={`${sora.variable} ${atkinson.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_ANTES_DA_PINTURA }} />
      </head>
      {/* Extensões de navegador (ColorZilla, gerenciadores de senha) injetam
          atributos em <body> antes da hidratação — ex.: cz-shortcut-listen.
          suppressHydrationWarning age só neste elemento, não nos filhos, então
          mismatches reais dentro da árvore continuam sendo reportados. */}
      <body suppressHydrationWarning>
        <ErrorSuppressor />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

