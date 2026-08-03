import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth-context';
import { ErrorSuppressor } from './components/ErrorSuppressor';
import './globals.css';

// Tema escuro é o default da marca (docs/07-design-system.md §1) — data-theme
// fica em <html> para que [data-theme="light"] (opt-in) possa sobrescrever.
export const metadata: Metadata = {
  title: 'Nota A — Aprenda jogando. Evolua estudando.',
  description:
    'Plataforma gamificada de preparação para o ENEM com IA adaptativa e personalização inclusiva.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/brand/favicon.ico',
    apple: '/brand/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#080E32',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
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

