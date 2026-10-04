'use client';

import { useState } from 'react';
import { cn } from '@notaa/ui';
import { Alunos } from './Alunos';
import { AnosLetivos } from './AnosLetivos';
import { Professores } from './Professores';
import { Turmas } from './Turmas';
import { VisaoGeral } from './VisaoGeral';

/**
 * Painel administrativo da instituição (perfis.md).
 *
 * Administrativo: rendimento, histórico e engajamento dos alunos vinculados,
 * gestão de turmas, de professores e de ano letivo. Nada de batalha, ranking
 * entre instituições ou competição — e nenhum comparativo entre professores.
 *
 * A guarda de papel vive no layout deste grupo de rotas, e a de verdade está no
 * servidor: cada rota confere escopo antes de devolver dado.
 */

const ABAS = [
  { id: 'visao', rotulo: 'Visão geral', Conteudo: VisaoGeral },
  { id: 'turmas', rotulo: 'Turmas', Conteudo: Turmas },
  { id: 'alunos', rotulo: 'Alunos', Conteudo: Alunos },
  { id: 'professores', rotulo: 'Professores', Conteudo: Professores },
  { id: 'anos', rotulo: 'Ano letivo', Conteudo: AnosLetivos },
] as const;

export default function InstituicaoPainelPage() {
  const [aba, setAba] = useState<(typeof ABAS)[number]['id']>('visao');
  const Conteudo = ABAS.find((a) => a.id === aba)?.Conteudo ?? VisaoGeral;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div
        role="tablist"
        aria-label="Seções do painel"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              aba === a.id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <Conteudo />
    </div>
  );
}
