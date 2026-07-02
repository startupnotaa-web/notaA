'use client';
import type { ReactNode, SVGProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@notaa/ui';
import { useUser } from '../../lib/user-context';

type IconProps = SVGProps<SVGSVGElement>;

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
  const { xp, level, streak, perfil, loading } = useUser();
  const isPremium = perfil?.plano && (perfil.plano.tipo === 'plus' || perfil.plano.tipo === 'escola');
  
  const progressoPorcento = Math.min((xp % 100) / 100 * 100, 100);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          href="/dashboard"
          aria-label="Nota A — ir para o início"
          className="flex items-center rounded-md"
        >
          <Image src="/brand/logo-full.png" alt="Nota A" width={46} height={30} priority />
        </Link>
        <div className="flex items-center gap-2">
          {!loading && (
            <>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-muted" title={`XP Total: ${xp}`}>
                Nível <strong className="font-semibold text-text">{level}</strong>
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-muted">
                🔥 <strong className="font-semibold text-text">{streak}</strong>
              </span>
              <span
                className={cn("rounded-full border border-border px-2.5 py-1 text-xs font-semibold", isPremium ? "bg-brand-accent/10 text-brand-accent" : "bg-surface-2 text-text-muted")}
                aria-label="Plano de IA"
              >
                {isPremium ? 'PRO' : 'Free'}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="h-1 w-full overflow-hidden bg-surface-2" aria-hidden="true">
        <div 
          className="h-full bg-gradient-brand transition-[width] duration-1000" 
          style={{ width: `${progressoPorcento}%` }} 
        />
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { role, loading, perfil } = useUser();
  
  // Condição para exibir aba da Escola
  const isEscola = role === 'escola' || (perfil?.plano && perfil.plano.tipo === 'escola');

  const navItems = [
    { href: '/dashboard', label: 'Início', Icon: HomeIcon },
    { href: '/trilhas', label: 'Trilha', Icon: CompassIcon },
    { href: '/estudo', label: 'Estudo', Icon: BookIcon },
    { href: '/arena', label: 'Arena', Icon: TargetIcon },
    { href: '/perfil', label: 'Perfil', Icon: UserIcon },
  ];

  if (isEscola) {
    navItems.push({ href: '/escola', label: 'Escola', Icon: SchoolIcon });
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"
    >
      <div className="mx-auto flex w-full max-w-4xl justify-around">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex min-h-[56px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300',
                active ? 'text-brand-primary' : 'text-text-muted hover:text-text',
              )}
            >
              <div className={cn("relative flex h-7 w-7 items-center justify-center transition-transform duration-300", active && "-translate-y-1 scale-110")}>
                 <Icon className="h-6 w-6" aria-hidden="true" />
                 {active && <span className="absolute -inset-1 rounded-full bg-brand-primary/20 blur-md -z-10" />}
              </div>
              <span>{label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  'h-1 rounded-t-lg transition-all duration-300 absolute bottom-0',
                  active ? 'bg-brand-primary w-8' : 'bg-transparent w-0 group-hover:w-4 group-hover:bg-border',
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Icons
function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

function CompassIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function BookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function TargetIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 4h5v5" />
      <path d="m19.5 4-8.2 8.2" />
      <path d="m13.2 13.2-3.4 3.4" />
      <path d="m9.3 17.3 3.4 3.4" />
      <path d="m4.8 19.2 3.4-3.4" />
      <path d="M4.8 14.8v4.4h4.4" />
    </svg>
  );
}

function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SchoolIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 9 12 4 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z" />
      <path d="M10 22v-6a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v6" />
      <path d="M14 10h.01" />
      <path d="M10 10h.01" />
      <path d="M14 14h.01" />
      <path d="M10 14h.01" />
    </svg>
  );
}
