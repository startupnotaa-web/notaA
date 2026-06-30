'use client';
// Hub do Módulo Estudo (E7/E8, doc 05 §6/§7): porta de entrada para o Corretor
// de Redação e o Tutor Socrático. As telas reais consomem a API; aqui é só a
// navegação. O Simulado (E6) entra numa fatia futura.
import Link from 'next/link';
import { Card, CardHeader, SectionHeader } from '@notaa/ui';

const FERRAMENTAS = [
  {
    href: '/estudo/redacao',
    icon: '✍️',
    title: 'Corretor de Redação',
    description: 'Escreva sua dissertação e receba nota por competência (0–200) com feedback citando o seu texto.',
  },
  {
    href: '/estudo/socratico',
    icon: '💬',
    title: 'Tutor Socrático',
    description: 'Tire dúvidas com um tutor que guia o seu raciocínio — adaptado ao seu Perfil Cognitivo 4D.',
  },
] as const;

export default function EstudoPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <SectionHeader
        title="Módulo"
        accent="Estudo"
        description="Aprofunde com as ferramentas de IA da Nota A."
        as="h1"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {FERRAMENTAS.map((f) => (
          <Link key={f.href} href={f.href} className="block">
            <Card className="group h-full transition-all hover:border-brand-primary/50 hover:bg-surface-2">
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                  <span
                    className="text-brand-primary transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
                <h2 className="text-lg font-bold text-text">{f.title}</h2>
                <p className="text-sm text-text-muted">{f.description}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
