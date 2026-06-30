'use client';

import React, { useState } from 'react';
import { cn } from '@notaa/ui';

type StudyTab = 'socratica' | 'redacao' | 'simulado';

export function NotaA_Estudo() {
  const [tab, setTab] = useState<StudyTab>('socratica');

  return (
    // Altura calculada para caber entre a TopBar e NavBar do AppShell sem quebrar o layout
    <div className="flex h-[calc(100vh-14rem)] flex-col w-full">
      
      {/* Seletor de Abas (Tabs) */}
      <div className="mb-4 flex w-full shrink-0 items-center justify-between rounded-full border border-white/10 bg-surface/50 p-1.5 backdrop-blur-md shadow-lg">
        <TabBtn 
          active={tab === 'socratica'} 
          onClick={() => setTab('socratica')} 
          label="Socrática" 
          icon="💬" 
        />
        <TabBtn 
          active={tab === 'redacao'} 
          onClick={() => setTab('redacao')} 
          label="Redação" 
          icon="✍️" 
        />
        <TabBtn 
          active={tab === 'simulado'} 
          onClick={() => setTab('simulado')} 
          label="Simulado" 
          icon="⚡" 
        />
      </div>

      {/* Área de Conteúdo Central (com overflow e isolamento visual) */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-white/5 bg-surface/20 shadow-inner">
        {tab === 'socratica' && <SocraticaModule />}
        {tab === 'redacao' && <RedacaoModule />}
        {tab === 'simulado' && <SimuladoModule />}
      </div>

    </div>
  );
}

// --- SUBMÓDULOS ---

function SocraticaModule() {
  return (
    <div className="relative flex h-full flex-col animate-in fade-in duration-300">
      {/* Aviso Superior */}
      <div className="shrink-0 p-4 text-center">
        <p className="inline-flex items-center rounded-full border border-brand-accent/20 bg-brand-accent/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-accent">
          O tutor não dá respostas diretas, ele guia o seu raciocínio
        </p>
      </div>
      
      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-5">
        <Balloon role="ai" text="Olá! Sou seu tutor socrático da Nota A. Em qual conceito do ENEM você travou hoje?" />
        <Balloon role="user" text="Não sei por onde começar a estudar Estequiometria, os cálculos me confundem..." />
        <Balloon role="ai" text="Entendo. Vamos pensar juntos usando o dia a dia: se você vai fazer uma receita de bolo que pede 2 ovos, e você quer fazer o triplo da receita, quantos ovos você usaria? A estequiometria química funciona exatamente como uma receita, mantendo as proporções." />
      </div>

      {/* Chat Input Fixo na base do módulo */}
      <div className="shrink-0 border-t border-white/5 bg-surface/60 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-bg p-2 shadow-inner">
          <input 
            type="text" 
            placeholder="Responda ao tutor..." 
            className="flex-1 bg-transparent px-3 text-base text-[#E2E8F0] placeholder:text-text-muted outline-none"
          />
          <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand transition-transform hover:scale-105 hover:brightness-110">
            <svg className="ml-0.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function RedacaoModule() {
  const [status, setStatus] = useState<'writing' | 'corrected'>('writing');

  if (status === 'writing') {
    return (
      <div className="flex h-full flex-col p-4 animate-in fade-in duration-300">
        <textarea 
          placeholder="Comece a digitar sua redação aqui. Não se preocupe com formatação, apenas concentre-se nas suas ideias e argumentos..."
          className="flex-1 w-full resize-none rounded-2xl border border-white/10 bg-surface/30 p-6 text-base leading-relaxed text-[#E2E8F0] placeholder:text-text-muted outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary backdrop-blur-md"
        />
        <button 
          onClick={() => setStatus('corrected')}
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-gradient-brand py-4 text-lg font-bold text-white shadow-brand transition-all hover:scale-[1.01] hover:brightness-110"
        >
          Enviar para Correção IA
        </button>
      </div>
    );
  }

  // Tela de Resultado Mockada
  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 space-y-8 animate-in slide-in-from-right-8 duration-500">
      
      {/* Header Nota */}
      <div className="flex items-center gap-6">
        <NotaCirculo nota={920} max={1000} />
        <div className="flex flex-col">
          <h3 className="text-3xl font-extrabold text-white">Excelente!</h3>
          <p className="mt-1 text-sm text-text-muted leading-relaxed">
            Seu texto apresentou ótima argumentação, mas perdeu pontos leves na proposta de intervenção.
          </p>
        </div>
      </div>
      
      {/* Competências Detalhadas */}
      <div className="space-y-5 rounded-3xl border border-white/10 bg-surface/40 p-6 shadow-xl backdrop-blur-xl">
        <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-xs">Competências (ENEM)</h4>
        <MiniBar label="C1: Domínio da Escrita" score={200} max={200} />
        <MiniBar label="C2: Tema e Estrutura" score={200} max={200} />
        <MiniBar label="C3: Argumentação" score={160} max={200} />
        <MiniBar label="C4: Coesão" score={200} max={200} />
        <MiniBar label="C5: Proposta de Intervenção" score={160} max={200} />
      </div>

      <button 
        onClick={() => setStatus('writing')}
        className="w-full rounded-2xl border border-white/10 bg-surface-2 py-4 font-bold text-white transition-colors hover:bg-surface-3"
      >
        Reescrever Redação
      </button>
    </div>
  );
}

function SimuladoModule() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      {/* Glow Fundo */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-brand opacity-20 blur-3xl"></div>
      
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/10 bg-surface/60 p-8 shadow-2xl backdrop-blur-2xl">
        <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-2 text-5xl shadow-inner">⏰</span>
        <h2 className="mb-2 text-2xl font-extrabold text-white">Simulado Oficial</h2>
        <p className="mb-8 text-sm text-text-muted">
          Você enfrentará 90 questões adaptativas baseadas na TRI. Encontre um lugar silencioso.
        </p>
        
        <div className="mb-8 flex w-full justify-around rounded-2xl border border-white/5 bg-bg/50 py-4 shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-extrabold text-brand-primary">4h</span>
            <span className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Estimado</span>
          </div>
          <div className="h-full w-px bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-extrabold text-brand-accent">90</span>
            <span className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">Questões</span>
          </div>
        </div>

        <button className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-brand px-6 py-4 text-base font-bold text-white shadow-brand transition-all hover:scale-[1.02]">
          <span className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-brand opacity-50 blur-md transition-opacity"></span>
          <span className="relative">Iniciar Simulado ENEM</span>
        </button>
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function TabBtn({ active, label, icon, onClick }: { active: boolean, label: string, icon: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 focus:outline-none",
        active ? "text-white bg-surface-2 shadow-md" : "text-text-muted hover:text-white"
      )}
    >
      <span className={cn("text-base transition-transform", active && "scale-110 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]")}>
        {icon}
      </span>
      <span>{label}</span>
      
      {/* Borda Neon Ativa */}
      {active && (
        <div className="absolute inset-0 rounded-full border border-brand-primary/50 shadow-[0_0_15px_rgba(0,229,255,0.15)]" />
      )}
    </button>
  );
}

function Balloon({ role, text }: { role: 'ai' | 'user'; text: string }) {
  const isAi = role === 'ai';
  
  if (isAi) {
    return (
      <div className="flex w-full justify-start animate-in slide-in-from-left-4 duration-500">
        {/* Wrapper do gradiente para simular border-image */}
        <div className="max-w-[85%] rounded-[24px] rounded-tl-sm bg-gradient-brand p-[1px] shadow-[0_4px_20px_rgba(213,0,249,0.15)]">
          <div className="h-full w-full rounded-[23px] rounded-tl-[2px] bg-surface/90 px-5 py-4 backdrop-blur-md">
            <p className="text-sm font-medium leading-relaxed text-[#E2E8F0]">
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-end animate-in slide-in-from-right-4 duration-500">
      <div className="max-w-[85%] rounded-[24px] rounded-tr-sm border border-white/5 bg-surface-2 px-5 py-4 shadow-lg">
        <p className="text-sm font-medium leading-relaxed text-white">
          {text}
        </p>
      </div>
    </div>
  );
}

function NotaCirculo({ nota, max }: { nota: number, max: number }) {
  const percent = (nota / max) * 100;
  return (
    <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full bg-surface-2 shadow-inner">
      <svg className="absolute inset-0 h-full w-full -rotate-90">
        <defs>
          <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#D500F9" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface/50" />
        {/* Progress */}
        <circle 
          cx="60" cy="60" r="52" fill="none" 
          stroke="url(#score-grad)"
          strokeWidth="8" 
          strokeDasharray="326.7" // 2 * pi * 52
          strokeDashoffset={326.7 - (326.7 * percent) / 100}
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-3xl font-extrabold text-white">{nota}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">/ {max}</span>
      </div>
    </div>
  );
}

function MiniBar({ label, score, max }: { label: string, score: number, max: number }) {
  const percent = (score / max) * 100;
  const isPerfect = score === max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-[#E2E8F0]">{label}</span>
        <span className={isPerfect ? "text-brand-primary" : "text-brand-accent"}>
          {score}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg/50 shadow-inner">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            isPerfect ? "bg-brand-primary shadow-[0_0_8px_rgba(0,229,255,0.5)]" : "bg-gradient-brand shadow-brand"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
