import Link from 'next/link';

export default function PreviewMenu() {
  const links = [
    { href: '/', title: '1. Landing Page', desc: 'A página pública principal do Nota A.' },
    { href: '/preview/auth', title: '2. Auth (Login/Cadastro)', desc: 'Contêiner centralizado com estados de autenticação.' },
    { href: '/preview/onboarding', title: '3. Onboarding', desc: 'Fluxo adaptativo tipo Typeform de 8 passos.' },
    { href: '/preview/app-shell', title: '4. App Shell Base', desc: 'O esqueleto do app (TopBar, XPBar e NavBar) e a tela Home.' },
    { href: '/preview/quiz', title: '5. Quiz Adaptativo', desc: 'Interface de batalha com animação de recompensa (XP).' },
    { href: '/preview/estudo', title: '6. Hub de Estudo', desc: 'IA Socrática (Chat) e Módulo de Correção de Redação.' },
    { href: '/preview/dashboard', title: '7. Dashboard / Batalha', desc: 'Progresso em radar, streak, e Batalha Coletiva.' },
    { href: '/preview/perfil', title: '8. Perfil do Estudante', desc: 'Avatar, Mapa Cognitivo 4D e Conquistas (Badges).' },
  ];

  return (
    <div className="min-h-screen bg-bg text-[#E2E8F0] p-6 pt-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-extrabold text-white text-center">Menu de Visualização (MVP)</h1>
        <p className="mb-8 text-text-muted text-center">
          Aqui estão todos os componentes que criamos isoladamente para você testar a interface e UX.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {links.map(l => (
            <Link 
              key={l.href} 
              href={l.href}
              className="group flex flex-col justify-center rounded-2xl border border-white/10 bg-surface/40 p-6 shadow-lg backdrop-blur-md transition-all hover:border-brand-primary hover:bg-surface/60 hover:scale-[1.02]"
            >
              <h2 className="text-xl font-bold text-brand-primary group-hover:text-brand-accent transition-colors">
                {l.title}
              </h2>
              <p className="mt-2 text-sm text-[#94A3B8]">
                {l.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
