import type { SVGProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter, Input } from '@notaa/ui';

type IconProps = SVGProps<SVGSVGElement>;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav Minimalista */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Image src="/brand/logo-full.png" alt="Nota A" width={80} height={50} priority />
          <Badge variant="brand" className="hidden sm:inline-flex">Beta 1.0 ao vivo</Badge>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Entrar</Link>
        </Button>
      </header>

      {/* Hero Section */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-6 pb-20 pt-16 text-center">
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          <span className="bg-gradient-brand bg-clip-text text-transparent">Aprenda jogando.</span><br />
          Evolua estudando.
        </h1>
        <p className="max-w-2xl text-xl text-text-muted">
          A primeira plataforma EdTech gamificada do Brasil com IA adaptativa. Personalizamos sua jornada do ENEM, do primeiro simulado à aprovação.
        </p>
        <div className="flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row">
          <Button asChild variant="cta" size="lg" className="shadow-brand">
            <Link href="/cadastro">Começar Grátis</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="#demonstracao">Ver demonstração</Link>
          </Button>
        </div>
      </section>

      {/* O problema é real (Glassmorphism) */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">O problema é real</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: 'Sem direcionamento', d: 'Você estuda o que já sabe e ignora o que mais cai.' },
            { t: 'Sem tempo', d: 'Rotinas pesadas que não se adaptam à sua vida real.' },
            { t: 'Método genérico', d: 'O cursinho ensina igual para todos, sem respeitar seu ritmo.' },
            { t: 'Neurodivergentes ignorados', d: 'TDAH, dislexia e autismo não são contemplados nos métodos.' },
          ].map((prob) => (
            <Card key={prob.t} className="border-white/5 bg-surface/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg">{prob.t}</CardTitle>
                <CardDescription>{prob.d}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* A Solução */}
      <section id="demonstracao" className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">A solução: Nota A</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: DiagnosticIcon, t: 'IA Diagnóstica', d: 'Descubra exatamente onde focar em 10 minutos.' },
            { i: WritingIcon, t: 'Redação com IA', d: 'Correção instantânea pelas 5 competências do ENEM.' },
            { i: ExamIcon, t: 'Simulado Adaptativo', d: 'Questões que evoluem junto com seu nível.' },
            { i: SocraticIcon, t: 'IA Socrática', d: 'Um tutor que ensina a pensar, não apenas dá respostas.' },
            { i: PvpIcon, t: 'Batalha PvP', d: 'Desafie amigos e aprenda de forma gamificada.' },
            { i: CertIcon, t: 'Certificados', d: 'Comprove suas horas de estudo e habilidades.' },
          ].map(({ i: Icon, t, d }) => (
            <Card key={t} className="border-border bg-surface-2">
              <CardHeader>
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-brand-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <CardTitle className="text-xl">{t}</CardTitle>
                <CardDescription>{d}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Para quem é */}
      <section className="bg-surface py-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">Feito para todo o ecossistema</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { role: 'Estudante', desc: 'Plano de estudos dinâmico, simulados gamificados e redações corrigidas em segundos.' },
              { role: 'Professor', desc: 'Acompanhe métricas da turma, identifique lacunas e personalize tarefas facilmente.' },
              { role: 'Escola', desc: 'Dashboard gerencial, gestão de assinaturas e relatórios de desempenho alinhados ao MEC.' },
            ].map((persona) => (
              <div key={persona.role} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
                  <span className="text-2xl font-bold text-brand-accent">{persona.role.charAt(0)}</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold">{persona.role}</h3>
                <p className="text-text-muted">{persona.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos (Pricing) */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold">Planos que cabem no bolso</h2>
        <p className="mb-12 text-center text-text-muted">Comece de graça, faça upgrade quando quiser.</p>
        <div className="grid items-center gap-6 lg:grid-cols-3">
          
          <Card className="flex flex-col border-border bg-surface">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <div className="mt-2 flex items-baseline text-3xl font-bold">R$ 0<span className="text-sm font-normal text-text-muted">/mês</span></div>
              <CardDescription>Para testar a metodologia.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm text-text-muted">
                <li>• Diagnóstico inicial</li>
                <li>• 1 Simulado adaptativo por mês</li>
                <li>• Tutoria IA limitada</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="secondary">Começar Grátis</Button>
            </CardFooter>
          </Card>

          <Card className="relative flex transform flex-col border-brand-primary bg-surface-2 shadow-brand lg:-translate-y-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-primary px-3 py-1 text-xs font-bold text-white">
              Mais Popular
            </div>
            <CardHeader>
              <CardTitle>Plus</CardTitle>
              <div className="mt-2 flex items-baseline text-4xl font-bold text-brand-primary">R$ 39<span className="text-sm font-normal text-text-muted">/mês</span></div>
              <CardDescription>O kit completo para sua aprovação.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm text-text-muted">
                <li>• Tudo do plano Free</li>
                <li>• Correção ilimitada de Redação</li>
                <li>• Simulados e desafios semanais</li>
                <li>• Acesso total à IA Socrática</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="cta">Assinar Plus</Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col border-border bg-surface">
            <CardHeader>
              <CardTitle>Escola</CardTitle>
              <div className="mt-2 flex items-baseline text-3xl font-bold">R$ 2.400<span className="text-sm font-normal text-text-muted">/ano</span></div>
              <CardDescription>Licença completa para instituições.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 text-sm text-text-muted">
                <li>• Até 100 alunos inclusos</li>
                <li>• Dashboards e relatórios MEC</li>
                <li>• Gestão de turmas e tarefas</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="secondary">Falar com Vendas</Button>
            </CardFooter>
          </Card>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-2 pb-8 pt-12">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 md:grid-cols-4">
          <div className="flex flex-col gap-4 md:col-span-2">
            <Image src="/brand/logo-full.png" alt="Nota A" width={80} height={50} />
            <p className="text-sm text-text-muted">Aprenda jogando. Evolua estudando.</p>
            <div className="mt-2 flex max-w-md items-center gap-2">
              <Input placeholder="Seu melhor e-mail" className="bg-bg" />
              <Button variant="primary">Lista de espera</Button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-bold">Plataforma</h4>
            <Link href="#" className="text-sm text-text-muted hover:text-text">Sobre nós</Link>
            <Link href="#" className="text-sm text-text-muted hover:text-text">Para Escolas</Link>
            <Link href="#" className="text-sm text-text-muted hover:text-text">Planos</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-bold">Contato</h4>
            <span className="text-sm text-text-muted">contato@notaa.com.br</span>
            <span className="text-sm text-text-muted">CNPJ: 12.345.678/0001-99</span>
            <div className="mt-2 flex gap-4">
              <Link href="#" className="text-sm text-text-muted hover:text-text">Privacidade</Link>
              <Link href="#" className="text-sm text-text-muted hover:text-text">Termos</Link>
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
function CertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}
