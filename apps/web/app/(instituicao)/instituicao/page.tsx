'use client';

import { useState } from 'react';
import { Tabs, propsDoPainel } from '@notaa/ui';
import { GestaoDeAnosLetivos } from '../../components/painel/GestaoDeAnosLetivos';
import { GestaoDeTurmas } from '../../components/painel/GestaoDeTurmas';
import { Alunos } from './Alunos';
import { Professores } from './Professores';
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

// A instituição gerencia quadro de professores, por isso `podeGerenciarProfessores`.
// O painel do professor independente reusa os mesmos componentes com `false`.
function TurmasDaInstituicao() {
  return <GestaoDeTurmas podeGerenciarProfessores />;
}

const ABAS = [
  { id: 'visao', rotulo: 'Visão geral', Conteudo: VisaoGeral },
  { id: 'turmas', rotulo: 'Turmas', Conteudo: TurmasDaInstituicao },
  { id: 'alunos', rotulo: 'Alunos', Conteudo: Alunos },
  { id: 'professores', rotulo: 'Professores', Conteudo: Professores },
  { id: 'anos', rotulo: 'Ano letivo', Conteudo: GestaoDeAnosLetivos },
] as const;

export default function InstituicaoPainelPage() {
  const [aba, setAba] = useState<(typeof ABAS)[number]['id']>('visao');
  const Conteudo = ABAS.find((a) => a.id === aba)?.Conteudo ?? VisaoGeral;

  return (
    <div className="space-y-6">
      <Tabs
        label="Seções do painel"
        idBase="painel"
        tabs={ABAS.map((a) => ({ id: a.id, label: a.rotulo }))}
        value={aba}
        onChange={(id) => setAba(id as (typeof ABAS)[number]['id'])}
      />

      <div {...propsDoPainel('painel', aba)}>
        <Conteudo />
      </div>
    </div>
  );
}
