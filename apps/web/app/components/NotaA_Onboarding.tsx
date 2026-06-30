'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@notaa/ui';

// --- TIPOS ---
export type OnboardingData = {
  nome: string;
  curso: string;
  estilo: string;
  dificuldades: string[];
  rotina: string;
  autopercepcao: string;
  neurodivergencias: string[];
};

type Props = {
  initialName?: string;
  onComplete: (dados: OnboardingData) => void;
};

// --- COMPONENTES INTERNOS EXIGIDOS ---

// PBtn: Botão primário para avançar
function PBtn({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-gradient-brand px-8 py-3.5 text-base font-bold text-white shadow-brand transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// SBtn: Botão secundário para voltar
function SBtn({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-border bg-transparent px-6 py-3.5 text-base font-medium text-text transition-all hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-focus",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// OCard: Cards de múltipla escolha com efeito glassmorphism e borda neon
function OCard({
  title,
  desc,
  icon,
  selected,
  onClick,
  className
}: {
  title: string;
  desc?: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border p-5 text-center transition-all duration-300",
        "bg-surface/30 backdrop-blur-md", // Glassmorphism base
        selected
          ? "border-brand-primary bg-focus/10 shadow-[0_0_20px_rgba(38,153,233,0.3)] scale-[1.02]" // Neon border e leve scale
          : "border-white/10 hover:border-white/30 hover:bg-surface-2",
        className
      )}
    >
      {icon && <span className="mb-1 text-4xl transition-transform group-hover:scale-110">{icon}</span>}
      <span className={cn("text-lg font-bold", selected ? "text-text" : "text-text-muted")}>{title}</span>
      {desc && <span className="text-sm font-medium text-text-muted/70">{desc}</span>}
    </button>
  );
}

// PRow: Linha de resumo do perfil gerado
function PRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-4 text-base">
      <span className="font-medium text-text-muted">{label}</span>
      <span className="max-w-[55%] text-right font-bold text-text">{value}</span>
    </div>
  );
}

// --- CONTÊINER PRINCIPAL (Typeform Style) ---

export function NotaA_Onboarding({ initialName = '', onComplete }: Props) {
  const [step, setStep] = useState(1);
  
  // Estado dos passos
  const [nome, setNome] = useState(initialName);
  const [curso, setCurso] = useState('');
  const [estilo, setEstilo] = useState('');
  const [dificuldades, setDificuldades] = useState<string[]>([]);
  const [rotina, setRotina] = useState('');
  const [autopercepcao, setAutopercepcao] = useState('');
  const [neuro, setNeuro] = useState<string[]>([]);

  // Opções Estáticas
  const CURSOS = [
    { id: 'medicina', title: 'Medicina', icon: '🩺' },
    { id: 'direito', title: 'Direito', icon: '⚖️' },
    { id: 'engenharia', title: 'Engenharia', icon: '🏗️' },
    { id: 'ti', title: 'Tecnologia', icon: '💻' },
    { id: 'psicologia', title: 'Psicologia', icon: '🧠' },
    { id: 'outro', title: 'Outro', icon: '🎯' },
  ];

  const ESTILOS = [
    { id: 'visual', title: 'Visual', desc: 'Gráficos, vídeos e mapas mentais', icon: '👀' },
    { id: 'lendo', title: 'Lendo', desc: 'Textos longos, resumos e PDFs', icon: '📖' },
    { id: 'pratica', title: 'Na Prática', desc: 'Mão na massa e exercícios', icon: '✍️' },
  ];

  const DIFICULDADES = [
    { id: 'mat', title: 'Matemática' },
    { id: 'nat', title: 'Ciências da Natureza' },
    { id: 'hum', title: 'Ciências Humanas' },
    { id: 'ling', title: 'Linguagens' },
    { id: 'red', title: 'Redação' },
  ];

  const ROTINAS = [
    { id: '30m', title: '30 minutos', desc: 'Microlearning diário' },
    { id: '1h', title: '1 hora', desc: 'Ritmo focado e constante' },
    { id: '2h+', title: '2 horas ou mais', desc: 'Imersão profunda' },
  ];

  const AUTOPERCEPCOES = [
    { id: 'curtas', title: 'Questões curtas' },
    { id: 'passo', title: 'Passo a passo' },
    { id: 'pausas', title: 'Pausas frequentes' },
    { id: 'desafio', title: 'Desafio' },
    { id: 'visual', title: 'Foco visual' },
    { id: 'contexto', title: 'Preciso de contexto' },
  ];

  const NEUROS = [
    { id: 'tdah', title: 'TDAH' },
    { id: 'dislexia', title: 'Dislexia' },
    { id: 'autismo', title: 'Autismo / TEA' },
  ];

  // Ações
  const toggleItem = (list: string[], setList: (l: string[]) => void, id: string) => {
    if (list.includes(id)) setList(list.filter(x => x !== id));
    else setList([...list, id]);
  };

  const next = () => setStep(s => Math.min(8, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));

  // Enter para avançar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && step < 8 && canGoNext()) {
        next();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const canGoNext = () => {
    switch (step) {
      case 1: return nome.trim().length > 0;
      case 2: return curso !== '';
      case 3: return estilo !== '';
      case 4: return dificuldades.length > 0;
      case 5: return rotina !== '';
      case 6: return autopercepcao !== '';
      case 7: return true; // Neurodivergência é 100% opcional
      case 8: return true;
      default: return false;
    }
  };

  const handleComplete = () => {
    onComplete({ nome, curso, estilo, dificuldades, rotina, autopercepcao, neurodivergencias: neuro });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-bg text-text">
      
      {/* Background Decorativo Suave */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-brand-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-brand-accent/5 blur-[120px]" />

      {/* Segmented Progress Bar (Top) */}
      <div className="fixed left-0 top-0 z-50 w-full p-6">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-700 ease-out",
                i + 1 <= step 
                  ? "bg-brand-primary shadow-[0_0_12px_rgba(38,153,233,0.8)]" 
                  : "bg-white/10"
              )} 
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
          Passo {step} de 8
        </p>
      </div>

      {/* Main Content Area (Centralizada, foco total em 1 pergunta) */}
      <div className="flex flex-1 items-center justify-center p-6 pt-24 pb-32">
        <div key={step} className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {step === 1 && (
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-12 text-4xl font-extrabold leading-tight sm:text-5xl">Como prefere ser chamado?</h2>
              <input
                autoFocus
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome ou apelido"
                className="w-full max-w-xl border-b-2 border-white/20 bg-transparent px-4 py-4 text-center text-3xl font-bold text-text placeholder:text-white/20 transition-colors focus:border-brand-primary focus:outline-none focus:ring-0"
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl">Qual curso você quer conquistar?</h2>
              <p className="mb-12 text-lg text-text-muted">Selecione o seu principal objetivo para ajustarmos a régua da TRI.</p>
              <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
                {CURSOS.map(c => (
                  <OCard key={c.id} icon={c.icon} title={c.title} selected={curso === c.id} onClick={() => setCurso(c.id)} />
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl">Qual seu estilo de aprendizagem?</h2>
              <p className="mb-12 text-lg text-text-muted">Isso define o formato dos materiais que a IA vai te recomendar.</p>
              <div className="grid w-full gap-5 sm:grid-cols-3">
                {ESTILOS.map(c => (
                  <OCard key={c.id} icon={c.icon} title={c.title} desc={c.desc} selected={estilo === c.id} onClick={() => setEstilo(c.id)} className="h-44" />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl">Onde o bicho pega no ENEM?</h2>
              <p className="mb-12 text-lg text-text-muted">Selecione as áreas que você tem mais dificuldade. (Múltipla escolha)</p>
              <div className="flex w-full flex-wrap justify-center gap-4">
                {DIFICULDADES.map(c => (
                  <OCard 
                    key={c.id} 
                    title={c.title} 
                    selected={dificuldades.includes(c.id)} 
                    onClick={() => toggleItem(dificuldades, setDificuldades, c.id)} 
                    className="w-auto px-8 py-5"
                  />
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl">Quanto tempo por dia você pode focar?</h2>
              <p className="mb-12 text-lg text-text-muted">Seja realista, vamos adaptar sua rotina de missões a isso.</p>
              <div className="grid w-full gap-5 sm:grid-cols-3">
                {ROTINAS.map(c => (
                  <OCard key={c.id} title={c.title} desc={c.desc} selected={rotina === c.id} onClick={() => setRotina(c.id)} className="h-32" />
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl">Como você rende mais?</h2>
              <p className="mb-12 text-lg text-text-muted">Escolha o formato que menos te cansa mentalmente ao estudar.</p>
              <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
                {AUTOPERCEPCOES.map(c => (
                  <OCard key={c.id} title={c.title} selected={autopercepcao === c.id} onClick={() => setAutopercepcao(c.id)} className="h-28" />
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl">Como a IA pode te abraçar melhor?</h2>
              
              {/* Privacy Badge Strict Rule */}
              <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-brand-secondary/40 bg-brand-secondary/10 px-6 py-3 text-sm font-semibold text-brand-secondary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                100% Opcional, Privado e Seguro. Usado apenas para adaptar nossa inteligência pedagógica.
              </div>

              <p className="mb-12 max-w-xl text-lg text-text-muted">
                Você tem algum diagnóstico como TDAH, Dislexia ou Autismo? Se sim, nossa plataforma irá habilitar modos específicos de leitura, fontes e ritmo para você.
              </p>
              <div className="flex w-full flex-wrap justify-center gap-4">
                {NEUROS.map(c => (
                  <OCard 
                    key={c.id} 
                    title={c.title} 
                    selected={neuro.includes(c.id)} 
                    onClick={() => toggleItem(neuro, setNeuro, c.id)} 
                    className="w-48 py-6"
                  />
                ))}
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="flex flex-col items-center text-center">
              <span className="mb-6 text-6xl">🎯</span>
              <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl">Seu perfil cognitivo está pronto!</h2>
              <p className="mb-10 text-lg text-text-muted">Revisamos suas respostas para gerar seu motor adaptativo.</p>
              
              <div className="mb-12 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-surface/40 p-2 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col rounded-2xl bg-bg/50 px-6 py-2">
                  <PRow label="Nome" value={nome} />
                  <PRow label="Objetivo" value={CURSOS.find(c => c.id === curso)?.title || curso} />
                  <PRow label="Estilo" value={ESTILOS.find(c => c.id === estilo)?.title || estilo} />
                  <PRow label="Dificuldades" value={dificuldades.length + ' áreas focais'} />
                  <PRow label="Foco diário" value={ROTINAS.find(c => c.id === rotina)?.title || rotina} />
                  <div className="flex items-center justify-between py-4 text-base">
                    <span className="font-medium text-text-muted">Neurodivergência</span>
                    <span className="max-w-[55%] text-right font-bold text-text">
                      {neuro.length > 0 ? neuro.map(n => NEUROS.find(x => x.id === n)?.title).join(', ') : 'Nenhuma declarada'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="group relative inline-flex items-center justify-center rounded-full bg-gradient-brand px-12 py-5 text-xl font-bold text-white shadow-brand transition-all hover:scale-105"
              >
                <span className="absolute -inset-1 animate-pulse rounded-full bg-gradient-brand opacity-60 blur-md"></span>
                <span className="relative">Começar minha jornada</span>
                <svg className="relative ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Typeform Footer / Controls */}
      {step < 8 && (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-white/5 bg-bg/80 p-5 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
            <div className="flex gap-4">
              {step > 1 ? (
                <SBtn onClick={prev} className="px-5">
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Voltar
                </SBtn>
              ) : (
                <div /> // Espaçador para flex-between
              )}
            </div>
            
            <div className="flex items-center gap-6">
              <span className="hidden text-sm font-medium text-text-muted sm:inline-block">
                Pressione <strong className="rounded bg-white/10 px-2 py-1 font-mono">Enter ↵</strong>
              </span>
              <PBtn onClick={next} disabled={!canGoNext()}>
                Continuar
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </PBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
