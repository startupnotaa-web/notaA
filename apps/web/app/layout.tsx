import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, Sora } from 'next/font/google';
import type { ReactNode } from 'react';
import { corDoToken } from '@notaa/ui';
import { AuthProvider } from '../lib/auth-context';
import { ContextoDeAcessoProvider } from '../lib/contexto-de-acesso-provider';
import { URL_DO_SITE } from '../lib/site';
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

export const metadata: Metadata = {
  // Base dos caminhos relativos de canonical e Open Graph das páginas públicas.
  metadataBase: new URL(URL_DO_SITE),
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
        {/* Claro é o padrão absoluto (docs/07-design-system.md); o escuro é opcional por data-theme em <html>, e só
            entra se a pessoa escolher "Escuro" ou "Do sistema" no Perfil. O script aplica a escolha guardada antes
            da pintura. É um arquivo estático (public/theme-init.js), não um script inline, por causa da CSP. */}
        <script src="/theme-init.js" />
      </head>
      {/* Extensões de navegador (ColorZilla, gerenciadores de senha) injetam
          atributos em <body> antes da hidratação — ex.: cz-shortcut-listen.
          suppressHydrationWarning age só neste elemento, não nos filhos, então
          mismatches reais dentro da árvore continuam sendo reportados. */}
      <body suppressHydrationWarning>
        <ErrorSuppressor />
        <AuthProvider>
          <ContextoDeAcessoProvider>{children}</ContextoDeAcessoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

