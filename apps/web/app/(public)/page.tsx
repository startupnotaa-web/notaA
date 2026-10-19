import type { SVGProps } from 'react';
import Link from 'next/link';
import { Aurora, ButtonLink, Chip, NotaASimbolo } from '@notaa/ui';
import { FEATURES } from '../../lib/feature-flags';

type IconProps = SVGProps<SVGSVGElement>;

const RECURSOS = [
  { i: DiagnosticIcon, t: 'Diagnóstico com IA', d: 'Descubra onde focar em 10 minutos.' },
  { i: WritingIcon, t: 'Redação corrigida', d: 'Correção instantânea pelas 5 competências do ENEM.' },
  { i: ExamIcon, t: 'Simulado adaptativo', d: 'Questões que evoluem junto com o seu nível.' },
  { i: SocraticIcon, t: 'Tutor socrático', d: 'Um tutor que ensina a pensar, não só dá a resposta.' },
  // A vitrine só anuncia o que está no ar. Com a Arena oculta (lib/feature-flags.ts), a Batalha PvP
  // cede o lugar à Previsão de nota, que já existe em /previsao-nota.
  FEATURES.arena
    ? { i: PvpIcon, t: 'Batalha PvP', d: 'Desafie amigos e aprenda de forma gamificada.' }
    : { i: ForecastIcon, t: 'Previsão de nota', d: 'Veja a projeção da sua nota crescer a cada simulado.' },
  { i: CertIcon, t: 'Certificados', d: 'Comprove suas horas de estudo e suas habilidades.' },
];

const PUBLICOS = [
  { quem: 'Estudante', texto: 'Plano de estudos que se ajusta a você, simulados e redações corrigidas em segundos.' },
  { quem: 'Professor', texto: 'Métricas da turma, lacunas à vista e tarefas personalizadas.' },
  { quem: 'Instituição', texto: 'Painel com o rendimento e o histórico dos alunos vinculados.' },
];

const PLANOS = [
  {
    nome: 'Grátis',
    preco: 'R$ 0',
    periodo: '/mês',
    descricao: 'Para conhecer o método.',
    itens: ['Diagnóstico inicial', '1 simulado adaptativo por mês', 'Tutoria com IA limitada'],
    acao: { rotulo: 'Começar grátis', href: '/cadastro', variante: 'secondary' as const },
  },
  {
    nome: 'Plus',
    preco: 'R$ 39',
    periodo: '/mês',
    descricao: 'O kit completo para a sua aprovação.',
    itens: ['Tudo do plano grátis', 'Correção ilimitada de redação', 'Simulados e desafios semanais', 'Acesso total ao tutor socrático'],
    destaque: true,
    acao: { rotulo: 'Ver o plano Plus', href: '/planos', variante: 'primary' as const },
  },
  {
    nome: 'Instituição',
    preco: 'R$ 2.400',
    periodo: '/ano',
    descricao: 'Licença completa para instituições.',
    itens: ['Até 100 alunos inclusos', 'Painéis e relatórios', 'Gestão de turmas e tarefas'],
    acao: { rotulo: 'Falar com a equipe', href: 'mailto:contato@notaa.com.br', variante: 'secondary' as const },
  },
];

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição: um HTML do build não teria nonce.
export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-space-4 md:px-space-6">
        <div className="flex items-center gap-space-4">
          <span className="flex items-center gap-2 font-display text-xl font-semibold">
            <NotaASimbolo className="h-8 w-auto" />
            Nota A
          </span>
          <Chip tone="brand" className="hidden sm:inline-flex">
            Beta ao vivo
          </Chip>
        </div>
        <ButtonLink as={Link} href="/login" variant="quiet">
          Entrar
        </ButtonLink>
      </header>

      <main>
        {/* Hero: a única tela centralizada do produto. A Aurora é o destaque de cor; o símbolo ocupa o espaço
            que o 3D vai usar depois (troque o conteúdo de data-slot="hero-3d" quando ele existir). */}
        <Aurora as="section">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-space-6 px-4 pb-space-8 pt-space-7 text-center md:pt-space-8">
            <div data-slot="hero-3d" className="flex h-24 items-center justify-center sm:h-32">
              <NotaASimbolo className="h-16 w-auto sm:h-24" />
            </div>
            <h1 className="m-0 font-display text-[40px] font-semibold leading-[44px] tracking-[-0.025em] text-ink sm:text-display">
              Aprenda jogando.
              <br />
              Evolua estudando.
            </h1>
            <p className="m-0 max-w-[30rem] text-lead text-ink-muted">
              Preparação para o ENEM que se adapta ao seu ritmo.
            </p>
            <div className="flex w-full flex-col justify-center gap-space-3 sm:w-auto sm:flex-row">
              <ButtonLink as={Link} href="/cadastro" variant="primary">
                Começar grátis
              </ButtonLink>
              <ButtonLink as={Link} href="#recursos" variant="secondary">
                Ver recursos
              </ButtonLink>
            </div>
          </div>
        </Aurora>

        <section id="recursos" aria-labelledby="recursos-titulo" className="mx-auto w-full max-w-5xl px-4 py-space-7 md:px-space-6 md:py-space-8">
          <h2 id="recursos-titulo" className="m-0 mb-space-7 font-display text-heading-2 text-ink">
            O que você encontra no Nota A
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-x-space-7 gap-y-space-6 p-0 sm:grid-cols-2">
            {RECURSOS.map(({ i: Icon, t, d }) => (
              <li key={t} className="flex gap-space-4 border-t border-line pt-space-5">
                <Icon className="mt-1 h-5 w-5 flex-none text-primary" aria-hidden="true" />
                <div className="flex flex-col gap-space-1">
                  <h3 className="m-0 font-display text-heading-3 text-ink">{t}</h3>
                  <p className="m-0 max-w-texto text-body text-ink-muted">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="publicos-titulo" className="mx-auto w-full max-w-5xl px-4 pb-space-7 md:px-space-6 md:pb-space-8">
          <h2 id="publicos-titulo" className="m-0 mb-space-7 font-display text-heading-2 text-ink">
            Feito para quem estuda e para quem ensina
          </h2>
          <div className="grid grid-cols-1 gap-x-space-7 gap-y-space-6 md:grid-cols-3">
            {PUBLICOS.map((p) => (
              <div key={p.quem} className="flex flex-col gap-space-2 border-t border-line pt-space-5">
                <h3 className="m-0 font-display text-heading-3 text-ink">{p.quem}</h3>
                <p className="m-0 text-body text-ink-muted">{p.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="planos-titulo" className="mx-auto w-full max-w-5xl px-4 pb-space-8 md:px-space-6">
          <h2 id="planos-titulo" className="m-0 font-display text-heading-2 text-ink">
            Planos
          </h2>
          <p className="m-0 mb-space-7 mt-space-2 text-body text-ink-muted">Comece de graça e mude de plano quando quiser.</p>
          <div className="grid grid-cols-1 gap-x-space-7 gap-y-space-7 md:grid-cols-3">
            {PLANOS.map((plano) => (
              <div key={plano.nome} className="flex flex-col gap-space-4 border-t border-line pt-space-5">
                <div className="flex items-center gap-space-3">
                  <h3 className="m-0 font-display text-heading-3 text-ink">{plano.nome}</h3>
                  {plano.destaque ? <Chip tone="brand">Mais escolhido</Chip> : null}
                </div>
                <p className="m-0 font-display text-figure tabular-nums text-ink">
                  {plano.preco}
                  <span className="text-body font-normal text-ink-muted">{plano.periodo}</span>
                </p>
                <p className="m-0 text-body text-ink-muted">{plano.descricao}</p>
                <ul className="m-0 flex list-none flex-col gap-space-2 p-0 text-body-sm text-ink">
                  {plano.itens.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="mt-space-2">
                  <ButtonLink as={Link} href={plano.acao.href} variant={plano.acao.variante}>
                    {plano.acao.rotulo}
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-space-5 px-4 py-space-7 md:flex-row md:items-start md:justify-between md:px-space-6">
          <div className="flex flex-col gap-space-2">
            <span className="flex items-center gap-2 font-display text-xl font-semibold">
              <NotaASimbolo className="h-8 w-auto" />
              Nota A
            </span>
            <p className="m-0 text-body-sm text-ink-muted">Aprenda jogando. Evolua estudando.</p>
          </div>
          <div className="flex flex-col gap-space-2 text-body-sm">
            <a href="mailto:contato@notaa.com.br" className="text-ink-muted hover:text-ink">
              contato@notaa.com.br
            </a>
            <div className="flex gap-space-5">
              <Link href="#" className="text-ink-muted hover:text-ink">
                Privacidade
              </Link>
              <Link href="#" className="text-ink-muted hover:text-ink">
                Termos
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Ícones SVGs extraídos/adaptados
function DiagnosticIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12h4l3-9 5 18 3-9h5" />
    </svg>
  );
}
function WritingIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
function ExamIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function SocraticIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.3L3 21l1.3-4A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3 2.4c-.7.2-1 .7-1 1.6" />
      <path d="M11.5 16h.01" />
    </svg>
  );
}
function PvpIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function ForecastIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function CertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}
