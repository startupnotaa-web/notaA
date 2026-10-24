'use client';

import { useState } from 'react';
import { PageHeader, Tabs, propsDoPainel } from '@notaa/ui';
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
  { id: 'visao', rotulo: 'Visão geral' },
  { id: 'turmas', rotulo: 'Turmas' },
  { id: 'alunos', rotulo: 'Alunos' },
  { id: 'professores', rotulo: 'Professores' },
  { id: 'anos', rotulo: 'Ano letivo' },
] as const;

type IdDaAba = (typeof ABAS)[number]['id'];

export default function InstituicaoPainelPage() {
  const [aba, setAba] = useState<IdDaAba>('visao');

  return (
    <div className="flex flex-col gap-space-6">
      <PageHeader title="Painel da instituição" description="Acompanhe turmas, alunos e professores em um só lugar." />

      <Tabs
        label="Seções do painel"
        idBase="painel"
        tabs={ABAS.map((a) => ({ id: a.id, label: a.rotulo }))}
        value={aba}
        onChange={(id) => setAba(id as IdDaAba)}
      />

      <div {...propsDoPainel('painel', aba)}>
        {aba === 'visao' && <VisaoGeral onIrParaAba={setAba} />}
        {aba === 'turmas' && <TurmasDaInstituicao />}
        {aba === 'alunos' && <Alunos />}
        {aba === 'professores' && <Professores />}
        {aba === 'anos' && <GestaoDeAnosLetivos />}
      </div>
    </div>
  );
}
