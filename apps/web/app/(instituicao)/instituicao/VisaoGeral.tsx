'use client';

import { useEffect, useState } from 'react';
import type { InstituicaoOverview } from '@notaa/contracts';
import {
  ActionRow,
  Button,
  Carregando,
  Chip,
  EmptyState,
  Notice,
  Section,
  Skeleton,
  SkeletonLinhas,
  SummaryStrip,
  Table,
} from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

const ROTULO_AREA: Record<string, string> = {
  linguagens: 'Linguagens',
  humanas: 'Ciências Humanas',
  natureza: 'Ciências da Natureza',
  matematica: 'Matemática',
  redacao: 'Redação',
};

function porcentagem(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

export function VisaoGeral({ onIrParaAba }: { onIrParaAba: (aba: 'turmas' | 'alunos') => void }) {
  const [dados, setDados] = useState<InstituicaoOverview | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const resposta = await apiFetch<InstituicaoOverview>('/instituicao/overview');
        if (!cancelado) setDados(resposta);
      } catch (e) {
        if (!cancelado) {
          setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os indicadores.');
        }
      }
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  if (erro) {
    return <Notice tone="danger">{erro}</Notice>;
  }

  if (!dados) {
    return (
      <Carregando rotulo="Carregando os indicadores" className="flex flex-col gap-space-6">
        <Skeleton className="h-24 w-full" />
        <SkeletonLinhas linhas={4} />
      </Carregando>
    );
  }

  const semAcesso = dados.turmas.filter((t) => t.alunosSemAcesso7d > 0);
  const totalSemAcesso = semAcesso.reduce((soma, t) => soma + t.alunosSemAcesso7d, 0);
  const nada = dados.solicitacoesPendentes === 0 && totalSemAcesso === 0;

  return (
    <div className="flex flex-col gap-space-6 md:gap-space-7">
      <SummaryStrip
        aria-label="Totais da instituição"
        items={[
          {
            id: 'alunos',
            label: 'Alunos',
            value: String(dados.totalAlunos),
            hint: 'Com matrícula ativa',
          },
          { id: 'turmas', label: 'Turmas ativas', value: String(dados.totalTurmas) },
          { id: 'professores', label: 'Professores', value: String(dados.totalProfessores) },
          {
            id: 'pendentes',
            label: 'Entradas pendentes',
            value: String(dados.solicitacoesPendentes),
            hint: dados.solicitacoesPendentes > 0 ? 'Aguardando aprovação' : undefined,
          },
        ]}
      />

      <Section title="Precisa de você">
        {nada ? (
          <Notice tone="success">
            Nenhuma entrada pendente e nenhum aluno sem acesso nos últimos 7 dias.
          </Notice>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {dados.solicitacoesPendentes > 0 && (
              <ActionRow
                status={<Chip tone="brand">Pendente</Chip>}
                title={`${dados.solicitacoesPendentes} ${dados.solicitacoesPendentes === 1 ? 'entrada aguardando' : 'entradas aguardando'} aprovação`}
                description="Alunos que pediram para entrar em turmas."
                action={
                  <Button variant="secondary" onClick={() => onIrParaAba('turmas')}>
                    Revisar entradas
                  </Button>
                }
              />
            )}
            {totalSemAcesso > 0 && (
              <ActionRow
                status={<Chip tone="warning">Atenção</Chip>}
                title={`${totalSemAcesso} ${totalSemAcesso === 1 ? 'aluno sem acesso' : 'alunos sem acesso'} há 7 dias`}
                description={`Turmas: ${semAcesso.map((t) => t.nome).join(', ')}.`}
                action={
                  <Button variant="secondary" onClick={() => onIrParaAba('alunos')}>
                    Ver alunos
                  </Button>
                }
              />
            )}
          </ul>
        )}
      </Section>

      <Section title="Engajamento" divided>
        <SummaryStrip
          aria-label="Engajamento dos alunos"
          items={[
            {
              id: 'xp',
              label: 'Média de XP',
              value: dados.mediaXp.toLocaleString('pt-BR'),
              hint: 'Contado a partir da aprovação de cada aluno',
            },
            {
              id: 'fragil',
              label: 'Área mais frágil',
              value: dados.areaMaisFragil
                ? (ROTULO_AREA[dados.areaMaisFragil.area] ?? dados.areaMaisFragil.area)
                : 'Sem dados',
              hint: dados.areaMaisFragil
                ? `${porcentagem(dados.areaMaisFragil.mediaAcertos)} de acerto`
                : 'Ainda não há respostas suficientes',
            },
          ]}
        />
      </Section>

      <Section title="Por turma" divided>
        {dados.turmas.length === 0 ? (
          <EmptyState title="Nenhuma turma ativa">
            Crie uma turma na aba Turmas para começar.
          </EmptyState>
        ) : (
          <Table caption="Indicadores por turma" captionOculta className="min-w-[42rem]">
            <thead>
              <tr>
                <th scope="col">Turma</th>
                <th scope="col">Ano</th>
                <th scope="col" className="text-right">
                  Alunos
                </th>
                <th scope="col" className="text-right">
                  Sem acesso (7d)
                </th>
                <th scope="col" className="text-right">
                  Pendentes
                </th>
                <th scope="col" className="text-right">
                  Média XP
                </th>
                <th scope="col">Área frágil</th>
              </tr>
            </thead>
            <tbody>
              {dados.turmas.map((t) => (
                <tr key={t.turmaId}>
                  <th scope="row" className="text-left font-bold text-ink">
                    {t.nome}
                  </th>
                  <td className="text-ink-muted">{t.anoLetivoRotulo}</td>
                  <td className="tabular text-right">{t.alunosAtivos}</td>
                  <td className="text-right">
                    {t.alunosSemAcesso7d > 0 ? (
                      <Chip tone="warning">{t.alunosSemAcesso7d} sem acesso</Chip>
                    ) : (
                      <span className="tabular text-ink-muted">0</span>
                    )}
                  </td>
                  <td className="text-right">
                    {t.solicitacoesPendentes > 0 ? (
                      <Chip tone="brand">{t.solicitacoesPendentes} pendentes</Chip>
                    ) : (
                      <span className="tabular text-ink-muted">0</span>
                    )}
                  </td>
                  <td className="tabular text-right">{t.mediaXp.toLocaleString('pt-BR')}</td>
                  <td className="text-ink-muted">
                    {t.areaMaisFragil
                      ? `${ROTULO_AREA[t.areaMaisFragil.area] ?? t.areaMaisFragil.area} · ${porcentagem(t.areaMaisFragil.mediaAcertos)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="m-0 text-caption text-ink-muted">
          Indicadores são por turma. A plataforma não compara nem classifica professores.
        </p>
      </Section>
    </div>
  );
}
