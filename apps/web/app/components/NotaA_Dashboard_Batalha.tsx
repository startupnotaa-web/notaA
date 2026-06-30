'use client';

import React, { useState } from 'react';
import { cn } from '@notaa/ui';

type DashTab = 'individual' | 'coletiva';

export function NotaA_Dashboard_Batalha() {
  const [tab, setTab] = useState<DashTab>('individual');

  return (
    // Altura calculada para respeitar o scroll fluido da Main Area no App Shell
    <div className="flex h-[calc(100vh-14rem)] w-full flex-col">
      
      {/* Toggle/Tabs Superior */}
      <div className="mb-5 flex w-full shrink-0 rounded-full border border-white/10 bg-surface/50 p-1.5 shadow-lg backdrop-blur-md">
        <ToggleBtn 
          active={tab === 'individual'} 
          onClick={() => setTab('individual')} 
          label="Meu Desempenho" 
        />
        <ToggleBtn 
          active={tab === 'coletiva'} 
          onClick={() => setTab('coletiva')} 
          label="Batalha Coletiva" 
        />
      </div>

      {/* Área de Conteúdo (Scrollable Interno) */}
      <div className="flex flex-1 flex-col overflow-y-auto rounded-[32px] border border-white/5 bg-surface-2/30 p-1 shadow-inner scrollbar-hide">
        {tab === 'individual' && <IndividualDashboard />}
        {tab === 'coletiva' && <BatalhaColetiva />}
      </div>
    </div>
  );
}

// --- SUBMÓDULOS ---

function IndividualDashboard() {
  // Mock do Streak (Domingo a Sábado)
  const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const STREAK_ACTIVE = [false, true, true, true, false, false, false]; // T, Q, Q estão acesos

  return (
    <div className="flex h-full flex-col space-y-6 p-4 animate-in fade-in duration-300">
      
      {/* Grid de StatCards 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Card 1: Nota Estimada (Com destaque luminoso) */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-primary/40 bg-surface/60 p-4 shadow-[0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-xl">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-brand-primary/20 blur-2xl" />
          <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Nota Estimada</p>
          <p className="relative z-10 mt-1 text-3xl font-extrabold text-[#E2E8F0] drop-shadow-md">740</p>
        </div>
        
        {/* Card 2: Nível */}
        <div className="rounded-2xl border border-white/5 bg-surface/40 p-4 backdrop-blur-md transition-all hover:bg-surface/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Nível Atual</p>
          <p className="mt-1 text-3xl font-extrabold text-[#E2E8F0]">12</p>
        </div>
        
        {/* Card 3: XP Total */}
        <div className="rounded-2xl border border-white/5 bg-surface/40 p-4 backdrop-blur-md transition-all hover:bg-surface/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">XP Total</p>
          <p className="mt-1 text-3xl font-extrabold text-brand-accent drop-shadow-[0_0_10px_rgba(213,0,249,0.3)]">4.250</p>
        </div>
        
        {/* Card 4: Streak */}
        <div className="rounded-2xl border border-white/5 bg-surface/40 p-4 backdrop-blur-md transition-all hover:bg-surface/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Streak</p>
          <p className="mt-1 flex items-baseline gap-1 text-3xl font-extrabold text-[#E2E8F0]">
            3 <span className="text-xl">🔥</span>
          </p>
        </div>
      </div>

      {/* UI do Streak Semanal Melhorada */}
      <div className="flex w-full flex-col items-center gap-4 rounded-[24px] border border-white/5 bg-surface/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Sua Jornada na Semana</span>
        <div className="flex w-full justify-between px-1">
          {WEEK_DAYS.map((day, i) => {
            const isActive = STREAK_ACTIVE[i];
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-extrabold transition-all duration-500",
                  isActive 
                    ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/50 shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-110" 
                    : "bg-surface-2 text-[#94A3B8] border border-white/5 opacity-60"
                )}>
                  {day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evolução por Área (Radar & MiniBars) */}
      <div className="flex flex-col rounded-[24px] border border-white/5 bg-surface/40 p-6 backdrop-blur-md pb-8">
        <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Domínio por Área</h4>
        
        {/* Radar Chart (RPG Style) - Espaço quadrado gerado por CSS */}
        <div 
          className="mx-auto mb-8 flex h-44 w-44 items-center justify-center rounded-full border border-white/10"
          style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(0,229,255,0.1) 0%, transparent 70%)' }}
        >
          {/* Mock visual de um gráfico de radar cibernético */}
          <svg className="h-full w-full opacity-40" viewBox="0 0 100 100">
            {/* Hexágono externo (Base) */}
            <polygon points="50,5 95,30 95,70 50,95 5,70 5,30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[#94A3B8]" />
            <polygon points="50,25 75,40 75,60 50,75 25,60 25,40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[#94A3B8]/50" />
            
            {/* Preenchimento de Habilidade (Domínio do Aluno) */}
            <polygon points="50,15 85,35 60,65 50,85 15,60 20,40" fill="rgba(213,0,249,0.2)" stroke="currentColor" strokeWidth="1.5" className="text-brand-accent drop-shadow-[0_0_5px_rgba(213,0,249,0.8)]" />
            
            {/* Linhas cruzadas estruturais */}
            <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />
            <line x1="5" y1="30" x2="95" y2="70" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />
            <line x1="5" y1="70" x2="95" y2="30" stroke="currentColor" strokeWidth="0.5" className="text-white/20" />
          </svg>
        </div>

        {/* MiniBars para as Áreas do ENEM */}
        <div className="space-y-5">
          <MiniBar label="Matemática e suas Tec." percent={85} />
          <MiniBar label="Linguagens" percent={60} />
          <MiniBar label="Ciências Humanas" percent={75} />
          <MiniBar label="Ciências da Natureza" percent={45} />
        </div>
      </div>
    </div>
  );
}

function BatalhaColetiva() {
  const xpA = 12500;
  const xpB = 10200;
  const total = xpA + xpB;
  const percentA = (xpA / total) * 100;
  const percentB = 100 - percentA;

  return (
    <div className="flex h-full flex-col justify-between p-5 animate-in slide-in-from-right-8 duration-500">
      
      {/* Header Duelo */}
      <div className="flex flex-col items-center pt-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-accent shadow-[0_0_10px_rgba(213,0,249,0.15)]">
          Temporada 1 • Semana 3
        </div>
        <h2 className="text-3xl font-extrabold text-[#E2E8F0]">Duelo de Turmas</h2>
        <p className="mt-2 text-sm text-[#94A3B8] max-w-[240px]">Cada questão correta na plataforma soma XP para a sua classe.</p>
      </div>

      {/* Versus Interface */}
      <div className="my-10 flex flex-col gap-8">
        <div className="flex items-center justify-between px-2">
          {/* Lado A (O Aluno) */}
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Sua Turma</span>
            <span className="mt-1 text-lg font-bold text-white">Terceirão A</span>
            <span className="text-xl font-extrabold text-brand-primary drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">{xpA.toLocaleString('pt-BR')} XP</span>
          </div>
          
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold italic text-[#94A3B8] shadow-inner">
            VS
          </div>
          
          {/* Lado B (Adversário) */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Adversário</span>
            <span className="mt-1 text-lg font-bold text-white">Terceirão B</span>
            <span className="text-xl font-extrabold text-brand-accent drop-shadow-[0_0_5px_rgba(213,0,249,0.5)]">{xpB.toLocaleString('pt-BR')} XP</span>
          </div>
        </div>

        {/* Health/XP Bar (Mirrored Fighting Game Style) */}
        <div className="relative flex h-4 w-full overflow-hidden rounded-full bg-surface-2 shadow-inner">
          <div 
            className="h-full bg-brand-primary shadow-[0_0_12px_rgba(0,229,255,0.8)] transition-all duration-1000 ease-out"
            style={{ width: `${percentA}%` }}
          />
          <div 
            className="h-full bg-brand-accent shadow-[0_0_12px_rgba(213,0,249,0.8)] transition-all duration-1000 ease-out"
            style={{ width: `${percentB}%` }}
          />
        </div>
      </div>

      {/* Ação Inferior */}
      <div className="rounded-[24px] border border-white/5 bg-surface/40 p-6 text-center backdrop-blur-xl mb-4">
        <h3 className="mb-2 text-xl font-bold text-white">Sua turma está vencendo!</h3>
        <p className="mb-8 text-sm text-[#94A3B8]">A diferença é pequena. Faça quizzes hoje para esmagar a concorrência.</p>
        
        <button className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-brand px-6 py-4.5 text-base font-bold text-white shadow-brand transition-all hover:scale-[1.02] hover:brightness-110">
          <span className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-brand opacity-50 blur-md transition-opacity"></span>
          <span className="relative flex items-center">
            ⚔️ Contribuir com XP
          </span>
        </button>
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function ToggleBtn({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center rounded-full py-3 text-xs sm:text-sm font-bold transition-all duration-300 focus:outline-none",
        active ? "text-white bg-surface-2 shadow-md" : "text-[#94A3B8] hover:text-white"
      )}
    >
      <span className="relative z-10">{label}</span>
      {/* Borda Neon Ativa */}
      {active && (
        <div className="absolute inset-0 rounded-full border border-brand-primary/50 shadow-[0_0_15px_rgba(0,229,255,0.15)]" />
      )}
    </button>
  );
}

function MiniBar({ label, percent }: { label: string, percent: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
        <span className="text-[#E2E8F0]">{label}</span>
        <span className="text-brand-primary drop-shadow-[0_0_2px_rgba(0,229,255,0.5)]">{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg/50 shadow-inner">
        <div 
          className="h-full rounded-full bg-gradient-brand shadow-[0_0_8px_rgba(0,229,255,0.4)] transition-all duration-1000 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
