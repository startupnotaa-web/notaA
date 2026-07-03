'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@notaa/ui';

type Tab = 'home' | 'quiz' | 'estudo' | 'resultado' | 'perfil';

const NAV_ITEMS = [
  { id: 'home', label: 'Início', Icon: HomeIcon },
  { id: 'quiz', label: 'Quiz', Icon: TargetIcon },
  { id: 'estudo', label: 'Estudo', Icon: BookIcon },
  { id: 'resultado', label: 'Resultado', Icon: ChartIcon },
  { id: 'perfil', label: 'Perfil', Icon: UserIcon },
] as const;

export function NotaA_Beta_App() {
  // Estado Global Simulado com persistência
  const [xpAtual, setXpAtual] = useState(450);
  const [xpMax, setXpMax] = useState(1000);
  const [notaEnemEstimada, setNotaEnemEstimada] = useState(650);
  const [creditosIA, setCreditosIA] = useState(10);
  const [abaAtiva, setAbaAtiva] = useState<Tab>('home');
  const [isHydrated, setIsHydrated] = useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('notaA_beta_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.xpAtual !== undefined) setXpAtual(parsed.xpAtual);
        if (parsed.xpMax !== undefined) setXpMax(parsed.xpMax);
        if (parsed.notaEnemEstimada !== undefined) setNotaEnemEstimada(parsed.notaEnemEstimada);
        if (parsed.creditosIA !== undefined) setCreditosIA(parsed.creditosIA);
        if (parsed.abaAtiva !== undefined) setAbaAtiva(parsed.abaAtiva);
      } catch (e) {
        console.error('Erro ao recuperar o estado:', e);
      }
    }
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('notaA_beta_state', JSON.stringify({
        xpAtual, xpMax, notaEnemEstimada, creditosIA, abaAtiva
      }));
    }
  }, [xpAtual, xpMax, notaEnemEstimada, creditosIA, abaAtiva, isHydrated]);

  const xpPercent = Math.min(100, Math.max(0, (xpAtual / xpMax) * 100));

  if (!isHydrated) return null; // Hydration Safe: Renderiza apenas após hidratar no cliente


  return (
    <div className="relative flex min-h-screen w-full flex-col bg-bg text-text overflow-hidden">
      
      {/* Definição do SVG Gradient para os ícones ativos */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brand-grad-svg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#D500F9" />
          </linearGradient>
        </defs>
      </svg>

      {/* TopBar (Barra Superior Fixa com Glassmorphism) */}
      <header className="fixed left-0 top-0 z-40 w-full border-b border-white/5 bg-surface/50 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3">
          <Image src="/brand/logo-full.png" alt="Nota A" width={56} height={36} priority />
          
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-2/60 px-3 py-1.5 text-xs font-semibold text-text-muted shadow-sm">
              Nota ENEM: <span className="font-bold text-white">{notaEnemEstimada}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-surface-2/60 px-3 py-1.5 text-xs font-semibold text-text-muted shadow-sm">
              Créditos IA: <span className="font-bold text-brand-accent">{creditosIA}/10</span>
            </span>
          </div>
        </div>
        
        {/* XPBar: barra de progresso horizontal fina na base da TopBar */}
        <div className="h-[3px] w-full bg-surface-2">
          <div 
            className="h-full bg-gradient-brand shadow-brand transition-all duration-1000 ease-out" 
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </header>

      {/* Main Content Area (Atenção ao padding) */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-28">
        <div className="mx-auto w-full max-w-2xl">
          {abaAtiva === 'home' && <HomeView />}
          {abaAtiva === 'quiz' && <PlaceholderView title="Quiz" desc="Seus testes e desafios adaptativos aparecerão aqui." />}
          {abaAtiva === 'estudo' && <PlaceholderView title="Estudo" desc="Trilhas de conhecimento e missões diárias." />}
          {abaAtiva === 'resultado' && <PlaceholderView title="Resultado" desc="Sua evolução cognitiva em gráficos detalhados." />}
          {abaAtiva === 'perfil' && <PlaceholderView title="Perfil" desc="Configurações e personalização da conta." />}
        </div>
      </main>

      {/* NavBar (Barra de Navegação Inferior Fixa com Glassmorphism) */}
      <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-white/5 bg-surface/70 pb-safe backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-md justify-around px-2 py-2">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = abaAtiva === id;
            return (
              <button
                key={id}
                onClick={() => setAbaAtiva(id)}
                className="group relative flex flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-colors focus:outline-none"
              >
                <div className="relative flex h-7 w-7 items-center justify-center">
                  {/* Glow do ícone ativo */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-gradient-brand opacity-30 blur-md transition-opacity duration-300" />
                  )}
                  {/* Ícone usando Gradiente via SVG */}
                  <Icon 
                    className={cn(
                      "relative z-10 h-6 w-6 transition-transform duration-300", 
                      isActive ? "scale-110 drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]" : "scale-100 group-hover:scale-110"
                    )} 
                    stroke={isActive ? "url(#brand-grad-svg)" : "#94A3B8"}
                  />
                </div>
                <span className={cn(
                  "text-[10px] font-bold tracking-wide transition-colors duration-300",
                  isActive ? "text-white" : "text-[#94A3B8] group-hover:text-text-muted"
                )}>
                  {label}
                </span>
                
                {/* Indicador inferior animado */}
                <div className={cn(
                  "absolute bottom-0 h-1 rounded-t-full transition-all duration-300 ease-out",
                  isActive ? "w-6 bg-gradient-brand shadow-brand" : "w-0 bg-transparent"
                )} />
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

// --- TELAS INTERNAS ---

function HomeView() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-white">Bem-vindo de volta! 👋</h1>
        <p className="text-lg text-text-muted">Pronto para mais um dia de evolução?</p>
      </div>

      {/* Streak Card */}
      <div className="rounded-2xl border border-white/5 bg-surface/40 p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#D500F9]/10 text-3xl shadow-[0_0_20px_rgba(213,0,249,0.2)]">
            🔥
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Seu streak atual é de 3 dias</h3>
            <p className="mt-1 text-sm text-text-muted">Continue estudando hoje para ganhar bônus de XP.</p>
          </div>
        </div>
      </div>

      {/* Missão Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-2 p-8 shadow-xl">
        {/* Glow de fundo no card */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-primary/10 blur-3xl" />
        
        <div className="relative z-10">
          <h3 className="mb-2 text-2xl font-bold text-white">Sua próxima missão</h3>
          <p className="mb-8 text-text-muted">
            Revisão Socrática de Ciências da Natureza baseada nos seus erros recentes.
          </p>
          
          <button className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-brand px-6 py-4 font-bold text-white shadow-brand transition-all hover:scale-[1.02]">
            <span className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-brand opacity-40 blur-md transition-opacity group-hover:opacity-60"></span>
            <span className="relative flex items-center text-lg">
              Continuar de onde parei
              <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderView({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center rounded-3xl border border-white/5 bg-surface/30 p-8 text-center backdrop-blur-md animate-in fade-in duration-300">
      <h2 className="mb-2 text-3xl font-bold text-white/50">{title}</h2>
      <p className="text-base text-text-muted/60">{desc}</p>
    </div>
  );
}

// --- ÍCONES SVG ---

type IconProps = React.SVGProps<SVGSVGElement>;

function HomeIcon({ stroke = "currentColor", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

function TargetIcon({ stroke = "currentColor", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

function BookIcon({ stroke = "currentColor", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" />
      <path d="M18 3v16" />
    </svg>
  );
}

function ChartIcon({ stroke = "currentColor", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="21" />
      <line x1="16" y1="12" x2="16" y2="21" />
      <line x1="8" y1="16" x2="8" y2="21" />
    </svg>
  );
}

function UserIcon({ stroke = "currentColor", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  );
}
