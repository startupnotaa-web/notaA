'use client';

import React, { useState } from 'react';
import { cn } from '@notaa/ui';

// --- MOCK DATA ---
const MOCK_QUESTION = {
  area: 'Matemática e suas Tecnologias',
  difficulty: 'Difícil',
  text: 'Um fazendeiro tem um terreno retangular de 50m por 30m e deseja cercá-lo com 3 voltas de arame. Sabendo que o portão de 2m não levará arame, qual a quantidade total de arame necessária, em metros?',
  options: [
    { id: 'A', text: '468' },
    { id: 'B', text: '474' },
    { id: 'C', text: '480' },
    { id: 'D', text: '154' },
    { id: 'E', text: '160' },
  ],
  correctId: 'B',
  xpReward: 50,
};

export function NotaA_Quiz_Batalha() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'answering' | 'revealed'>('answering');
  const [streak, setStreak] = useState(3);
  const [showXp, setShowXp] = useState(false);

  const handleConfirm = () => {
    if (!selectedId) return;
    setStatus('revealed');
    
    // Verifica Acerto
    if (selectedId === MOCK_QUESTION.correctId) {
      setStreak(s => s + 1);
      setShowXp(true);
      // Oculta a animação de XP após 2.5s
      setTimeout(() => setShowXp(false), 2500);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    // Reset para simular a próxima questão
    setStatus('answering');
    setSelectedId(null);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-bg text-[#E2E8F0]">
      
      {/* Background Decorativo Suave (Foco) */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full bg-brand-primary/5 blur-[120px]" />

      {/* Gamificação: Animação Flutuante de XP */}
      {showXp && (
        <div className="pointer-events-none absolute left-1/2 top-[40%] z-50 -translate-x-1/2 -translate-y-1/2 animate-[floatUp_2.5s_ease-out_forwards]">
          <span className="text-4xl font-extrabold text-success drop-shadow-[0_0_20px_rgba(61,220,151,1)]">
            +{MOCK_QUESTION.xpReward} XP
          </span>
        </div>
      )}

      {/* Cabeçalho da Questão */}
      <header className="relative z-10 flex w-full flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-brand-secondary/40 bg-brand-secondary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-secondary shadow-[0_0_10px_rgba(213,0,249,0.15)]">
            {MOCK_QUESTION.area}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-surface-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Nível: {MOCK_QUESTION.difficulty}
          </span>
        </div>
        
        {/* Streak Counter */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface/50 px-4 py-2 shadow-lg backdrop-blur-md self-start sm:self-auto">
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,165,0,0.8)]">🔥</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Sequência</span>
            <span className="text-base font-extrabold text-white leading-none">{streak} acertos</span>
          </div>
        </div>
      </header>

      {/* Corpo Principal (Enunciado e Alternativas) */}
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-36 pt-4">
        
        {/* Enunciado da Questão (Glassmorphism) */}
        <div className="mb-10 rounded-[28px] border border-white/10 bg-surface/40 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
          <p className="text-lg font-medium leading-relaxed text-[#E2E8F0] sm:text-xl">
            {MOCK_QUESTION.text}
          </p>
        </div>

        {/* Lista de Alternativas (A a E) */}
        <div className="flex flex-col gap-3">
          {MOCK_QUESTION.options.map(opt => {
            const isSelected = selectedId === opt.id;
            const isCorrect = opt.id === MOCK_QUESTION.correctId;
            let state: 'neutral' | 'selected' | 'correct' | 'incorrect' = 'neutral';
            
            // Lógica de Estados
            if (status === 'answering' && isSelected) {
              state = 'selected';
            }
            if (status === 'revealed') {
              if (isCorrect) state = 'correct';
              else if (isSelected && !isCorrect) state = 'incorrect';
            }

            return (
              <AltBtn 
                key={opt.id} 
                id={opt.id} 
                text={opt.text} 
                state={state} 
                onClick={() => status === 'answering' && setSelectedId(opt.id)} 
              />
            );
          })}
        </div>
      </main>

      {/* Botão de Ação Inferior Fixo */}
      <div className="fixed bottom-0 left-0 z-40 w-full border-t border-white/5 bg-bg/85 p-5 backdrop-blur-2xl pb-safe">
        <div className="mx-auto w-full max-w-3xl">
          {status === 'answering' ? (
            <button
              onClick={handleConfirm}
              disabled={!selectedId}
              className={cn(
                "group relative flex w-full items-center justify-center rounded-2xl px-8 py-4.5 text-lg font-bold transition-all duration-300",
                selectedId
                  ? "bg-gradient-brand text-white shadow-[0_0_20px_rgba(38,153,233,0.4)] hover:brightness-110 hover:scale-[1.01]"
                  : "bg-surface-2 text-text-muted opacity-50 cursor-not-allowed"
              )}
            >
              {selectedId && <span className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-brand opacity-40 blur-lg transition-opacity duration-300"></span>}
              <span className="relative">Confirmar Resposta</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="group relative flex w-full items-center justify-center rounded-2xl border border-white/10 bg-surface-2 px-8 py-4.5 text-lg font-bold text-white shadow-lg transition-all hover:bg-surface-3 hover:border-white/20 hover:scale-[1.01]"
            >
              <span>Próxima Questão</span>
              <svg className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Estilos inline de Keyframes para animação de Recompensa */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUp {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; filter: blur(4px); }
          15% { transform: translate(-50%, -30px) scale(1.2); opacity: 1; filter: blur(0px); }
          30% { transform: translate(-50%, -40px) scale(1); opacity: 1; }
          80% { transform: translate(-50%, -80px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -100px) scale(0.9); opacity: 0; filter: blur(2px); }
        }
      `}} />
    </div>
  );
}

// --- COMPONENTE INTERNO: BOTÃO DE ALTERNATIVA (AltBtn) ---

function AltBtn({ 
  id, 
  text, 
  state, 
  onClick 
}: { 
  id: string; 
  text: string; 
  state: 'neutral' | 'selected' | 'correct' | 'incorrect';
  onClick: () => void;
}) {
  const isNeutral = state === 'neutral';
  const isSelected = state === 'selected';
  const isCorrect = state === 'correct';
  const isIncorrect = state === 'incorrect';

  return (
    <button
      onClick={onClick}
      // Se não for neutro e não for selecionado ativamente (durante a resposta), tira o hover (ex: quando revelado e está neutro)
      disabled={state !== 'neutral' && state !== 'selected'} 
      className={cn(
        "group relative flex w-full items-center gap-4 rounded-[20px] border p-5 text-left transition-all duration-300 disabled:cursor-default",
        
        // Estado Neutro
        isNeutral && "border-white/10 bg-surface/30 hover:border-white/30 hover:bg-surface/50 text-[#E2E8F0]",
        
        // Estado Selecionado (Ciano Neon)
        isSelected && "border-brand-primary bg-focus/15 shadow-[0_0_20px_rgba(0,229,255,0.25)] text-white scale-[1.015]",
        
        // Estado Correto (Verde Neon)
        isCorrect && "border-success bg-success/15 shadow-[0_0_25px_rgba(61,220,151,0.25)] text-white scale-[1.015]",
        
        // Estado Incorreto (Vermelho Neon)
        isIncorrect && "border-error bg-error/15 shadow-[0_0_25px_rgba(255,59,48,0.2)] text-white"
      )}
    >
      {/* Indicador de Letra (A, B, C...) */}
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 font-extrabold transition-colors duration-300",
        isNeutral && "border-white/10 bg-surface-2 text-text-muted group-hover:border-white/30 group-hover:text-white",
        isSelected && "border-brand-primary bg-brand-primary/20 text-brand-primary",
        isCorrect && "border-success bg-success/20 text-success",
        isIncorrect && "border-error bg-error/20 text-error"
      )}>
        {id}
      </div>
      
      {/* Texto da Alternativa */}
      <span className="flex-1 text-base font-semibold leading-relaxed sm:text-lg">{text}</span>

      {/* Ícone de Feedback (Acessibilidade Visual além da cor) */}
      {isCorrect && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/20 text-success animate-in zoom-in duration-300">
          <svg className="h-6 w-6 drop-shadow-[0_0_5px_rgba(61,220,151,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {isIncorrect && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error/20 text-error animate-in zoom-in duration-300">
          <svg className="h-6 w-6 drop-shadow-[0_0_5px_rgba(255,59,48,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
    </button>
  );
}
