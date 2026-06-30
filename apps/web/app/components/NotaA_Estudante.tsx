'use client';

import React, { useState } from 'react';
import { cn } from '@notaa/ui';

type ProfileTab = 'mapa4d' | 'conquistas' | 'certificados';

export function NotaA_Estudante() {
  const [tab, setTab] = useState<ProfileTab>('mapa4d');

  return (
    // Altura calculada para encaixar entre TopBar e NavBar do App Shell
    <div className="flex h-[calc(100vh-14rem)] w-full flex-col">
      
      {/* CABEÇALHO DE IDENTIDADE */}
      <div className="mb-5 flex shrink-0 flex-col items-center justify-center rounded-[32px] border border-white/5 bg-surface/40 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* Avatar com Borda Iluminada (Gradiente Ciano/Magenta) */}
        <div className="relative mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-surface-2 p-[3px] shadow-[0_0_30px_rgba(0,229,255,0.4)]">
          {/* Anel de gradiente ao fundo */}
          <div className="absolute inset-0 rounded-full bg-gradient-brand" />
          {/* Fundo do Avatar (para mascarar o centro do gradiente) */}
          <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-bg">
            <span className="text-5xl">😎</span>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-white drop-shadow-md">Alexandre Alves</h2>
        
        {/* Pill de Nível */}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-accent shadow-[0_0_10px_rgba(213,0,249,0.2)]">
          Nível 5
        </div>

        {/* XPBar Geral do Aluno */}
        <div className="mt-6 flex w-full max-w-[280px] flex-col gap-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
            <span>XP Total</span>
            <span className="text-brand-primary drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">4.250 / 5.000</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-bg/60 shadow-inner">
            <div className="h-full w-[85%] rounded-full bg-gradient-brand shadow-[0_0_10px_rgba(0,229,255,0.6)]" />
          </div>
        </div>
      </div>

      {/* SELETOR DE ABAS (Navegação Interna) */}
      <div className="mb-4 flex w-full shrink-0 rounded-full border border-white/10 bg-surface/50 p-1.5 shadow-lg backdrop-blur-md">
        <TabBtn active={tab === 'mapa4d'} onClick={() => setTab('mapa4d')} label="Meu Mapa 4D" />
        <TabBtn active={tab === 'conquistas'} onClick={() => setTab('conquistas')} label="Conquistas" />
        <TabBtn active={tab === 'certificados'} onClick={() => setTab('certificados')} label="Certificados" />
      </div>

      {/* ÁREA DE CONTEÚDO (Scrollable interno, isolado) */}
      {/* Adicionado um pb-12 generoso para o conteúdo final não ficar espremido no final do container */}
      <div className="flex flex-1 flex-col overflow-y-auto rounded-[32px] border border-white/5 bg-surface-2/30 p-4 shadow-inner scrollbar-hide pb-16">
        
        {tab === 'mapa4d' && <MapaCognitivoModule />}
        {tab === 'conquistas' && <ConquistasModule />}
        {tab === 'certificados' && <CertificadosModule />}

        {/* Botões de Ação da Conta fixados no fluxo de scroll final */}
        <div className="mt-10 flex flex-col gap-3 shrink-0 animate-in fade-in duration-700">
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface/50 py-4 text-sm font-bold text-white transition-all hover:bg-surface-3">
            <span>⚙️</span> Configurações da Conta
          </button>
          <button className="flex w-full items-center justify-center rounded-2xl border border-error/10 bg-error/5 py-4 text-sm font-bold text-error transition-all hover:bg-error/10">
            Sair do App
          </button>
        </div>
      </div>
      
    </div>
  );
}

// --- SUBMÓDULOS DE CONTEÚDO ---

function MapaCognitivoModule() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
      
      {/* Seção 4D Spectrums */}
      <div className="rounded-[24px] border border-white/5 bg-surface/40 p-6 backdrop-blur-md">
        <div className="mb-6 flex flex-col">
          <h3 className="text-lg font-extrabold text-white">Mapa Cognitivo 4D</h3>
          <p className="text-xs text-[#94A3B8]">As dimensões de como seu cérebro processa o ensino.</p>
        </div>

        <div className="space-y-6">
          <Eixo4D left="Visual" right="Verbal" percent={25} />
          <Eixo4D left="Analítico" right="Holístico" percent={80} />
          <Eixo4D left="Sequencial" right="Aleatório" percent={35} />
          <Eixo4D left="Reflexivo" right="Impulsivo" percent={75} />
        </div>
      </div>

      {/* Dicas da IA (Recomendações Glassmorphism) */}
      <div className="flex flex-col gap-3">
        <h4 className="px-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">A IA recomenda:</h4>
        
        <div className="flex items-start gap-4 rounded-2xl border border-brand-primary/30 bg-brand-primary/10 p-5 shadow-lg backdrop-blur-md transition-all hover:bg-brand-primary/15">
           <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-xl shadow-[0_0_10px_rgba(0,229,255,0.4)]">
             💡
           </span>
           <p className="text-sm font-medium leading-relaxed text-[#E2E8F0]">
             Sua dominância <strong className="text-brand-primary drop-shadow-[0_0_2px_rgba(0,229,255,0.6)]">Visual</strong> sugere que utilizar mapas mentais e vídeos vai acelerar drasticamente sua retenção em História e Geografia.
           </p>
        </div>
        
        <div className="flex items-start gap-4 rounded-2xl border border-brand-accent/30 bg-brand-accent/10 p-5 shadow-lg backdrop-blur-md transition-all hover:bg-brand-accent/15">
           <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-accent/20 text-xl shadow-[0_0_10px_rgba(213,0,249,0.4)]">
             💡
           </span>
           <p className="text-sm font-medium leading-relaxed text-[#E2E8F0]">
             Por ter um perfil <strong className="text-brand-accent drop-shadow-[0_0_2px_rgba(213,0,249,0.6)]">Holístico</strong>, sempre leia a conclusão ou a introdução de uma redação antes de tentar entender a argumentação central.
           </p>
        </div>
      </div>
    </div>
  );
}

function Eixo4D({ left, right, percent }: { left: string, right: string, percent: number }) {
  // Lógica de UI para destacar qual dos lados domina mais.
  const isLeftDominant = percent < 50;
  
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between text-[11px] font-extrabold uppercase tracking-widest text-[#E2E8F0]">
        <span className={cn(isLeftDominant ? "text-brand-primary drop-shadow-[0_0_3px_rgba(0,229,255,0.6)]" : "text-[#94A3B8]/80")}>{left}</span>
        <span className={cn(!isLeftDominant ? "text-brand-accent drop-shadow-[0_0_3px_rgba(213,0,249,0.6)]" : "text-[#94A3B8]/80")}>{right}</span>
      </div>
      
      <div className="relative h-2 w-full rounded-full bg-bg/80 shadow-inner">
        {/* Linha Neutra no Centro (50%) */}
        <div className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-white/30" />
        
        {/* Marcador/Ponteiro Luminoso */}
        <div 
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-bg bg-white shadow-[0_0_15px_rgba(0,229,255,0.8)] transition-all duration-1000 ease-out"
          style={{ left: `${percent}%`, 
                   boxShadow: isLeftDominant 
                    ? '0 0 15px rgba(0, 229, 255, 0.8), inset 0 0 4px rgba(0,229,255,1)' 
                    : '0 0 15px rgba(213, 0, 249, 0.8), inset 0 0 4px rgba(213,0,249,1)' 
                }}
        />
      </div>
    </div>
  );
}

function ConquistasModule() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-extrabold text-white">Suas Insígnias</h3>
        <span className="rounded-full bg-brand-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-primary">
          2 de 5
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Desbloqueados */}
        <BadgeCard icon="🔥" title="Iniciante Ávido" desc="Completou 3 dias de streak." unlocked />
        <BadgeCard icon="🎯" title="Mira Certa" desc="Acertou 10 questões de matemática." unlocked />
        
        {/* Bloqueados */}
        <BadgeCard icon="🔒" title="Mestre Jedi" desc="Atinja o nível 20." />
        <BadgeCard icon="🔒" title="Redator 1000" desc="Tire 950+ na correção IA." />
        <BadgeCard icon="🔒" title="Imparável" desc="Mantenha 30 dias de streak." />
      </div>
    </div>
  );
}

function BadgeCard({ icon, title, desc, unlocked = false }: { icon: string, title: string, desc: string, unlocked?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all duration-300",
      unlocked 
        ? "border-brand-primary/30 bg-surface/50 shadow-[0_0_20px_rgba(0,229,255,0.15)] backdrop-blur-md" 
        : "border-white/5 bg-surface/10 opacity-60 grayscale hover:grayscale-0 hover:opacity-80"
    )}>
      <div className={cn(
        "mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-inner",
        unlocked ? "bg-gradient-brand text-white shadow-[inset_0_-4px_10px_rgba(0,0,0,0.3)]" : "bg-surface-2 text-[#94A3B8]"
      )}>
        {icon}
      </div>
      <h4 className={cn("mb-1 text-[11px] font-extrabold uppercase tracking-wide", unlocked ? "text-white" : "text-[#94A3B8]")}>
        {title}
      </h4>
      <p className="text-[10px] font-medium leading-relaxed text-[#94A3B8]">{desc}</p>
    </div>
  );
}

function CertificadosModule() {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center rounded-3xl border border-white/5 bg-surface/20 p-8 text-center animate-in fade-in duration-500">
      <span className="mb-4 text-6xl opacity-30 grayscale">📜</span>
      <h3 className="mb-2 text-xl font-bold text-white/50">Área de Certificados</h3>
      <p className="text-sm text-[#94A3B8]/60">
        Evolua no motor adaptativo para gerar e autenticar seus primeiros certificados de domínio na Blockchain.
      </p>
    </div>
  );
}

function TabBtn({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center rounded-full py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 focus:outline-none",
        active ? "text-white bg-surface-2 shadow-md" : "text-[#94A3B8] hover:text-white"
      )}
    >
      <span className="relative z-10">{label}</span>
      {/* Borda Glow Neon Ativa */}
      {active && (
        <div className="absolute inset-0 rounded-full border border-brand-primary/50 shadow-[0_0_12px_rgba(0,229,255,0.2)]" />
      )}
    </button>
  );
}
