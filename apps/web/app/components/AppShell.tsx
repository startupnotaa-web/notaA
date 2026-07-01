'use client';
// App Shell do Estudante (docs/01 §4 + docs/07 §3): logo na barra superior,
// barra de XP em gradiente e navegação inferior com ícones SVG + estado ativo
// (aria-current + indicador de forma, não só cor — doc 07 §7). Dados reais
// (θ→nota, XP) chegam na fatia vertical E1→E2; aqui a estrutura visual importa.
import type { ReactNode, SVGProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@notaa/ui';

type IconProps = SVGProps<SVGSVGElement>;

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', Icon: HomeIcon },
  { href: '/quiz', label: 'Quiz', Icon: TargetIcon },
  { href: '/estudo', label: 'Estudo', Icon: BookIcon },
  { href: '/trilhas', label: 'Trilhas', Icon: CompassIcon },
  { href: '/perfil', label: 'Perfil', Icon: UserIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <TopBar />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          href="/dashboard"
          aria-label="Nota A — ir para o início"
          className="flex items-center rounded-md"
        >
          <Image src="/brand/logo-full.png" alt="Nota A" width={46} height={30} priority />
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-muted">
            Estimativa <strong className="font-semibold text-text">— *</strong>
          </span>
          <span
            className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-muted"
            aria-label="Uso de IA hoje"
          >
            IA 0/∞
          </span>
        </div>
      </div>
      {/* Barra de XP em gradiente (doc 07 §3) — preenche conforme o aluno evolui. */}
      <div className="h-1 w-full overflow-hidden bg-surface-2" aria-hidden="true">
        <div className="h-full w-0 bg-gradient-brand transition-[width] duration-base" />
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface"
    >
      <div className="mx-auto flex w-full max-w-3xl justify-around">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors duration-fast',
                active ? 'text-text' : 'text-text-muted hover:text-text',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  'h-0.5 w-6 rounded-full',
                  active ? 'bg-gradient-brand' : 'bg-transparent',
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

function TargetIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

function BookIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" />
      <path d="M18 3v16" />
    </svg>
  );
}

function UserIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  );
}

function CompassIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
