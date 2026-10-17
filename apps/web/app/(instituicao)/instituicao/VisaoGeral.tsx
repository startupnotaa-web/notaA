'use client';

import { useEffect, useState } from 'react';
import type { InstituicaoOverview } from '@notaa/contracts';
import { Card, CardHeader, Chip, EmptyState, Notice, Skeleton, Stat, Table } from '@notaa/ui';
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

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <Card>
      <CardHeader>
        <Stat label={rotulo} value={valor} hint={detalhe} />
      </CardHeader>
    </Card>
  );
}

export function VisaoGeral() {
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
    return (
      <Notice tone="danger">{erro}</Notice>
    );
  }

  if (!dados) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Alunos" valor={String(dados.totalAlunos)} detalhe="Com matrícula ativa" />
        <Indicador rotulo="Turmas ativas" valor={String(dados.totalTurmas)} />
        <Indicador rotulo="Professores" valor={String(dados.totalProfessores)} />
        <Indicador
          rotulo="Entradas pendentes"
          valor={String(dados.solicitacoesPendentes)}
          detalhe={dados.solicitacoesPendentes > 0 ? 'Aguardando aprovação' : undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Indicador
          rotulo="Média de XP"
          valor={dados.mediaXp.toLocaleString('pt-BR')}
          detalhe="Contado a partir da aprovação de cada aluno"
        />
        <Indicador
          rotulo="Área mais frágil"
          valor={
            dados.areaMaisFragil
              ? (ROTULO_AREA[dados.areaMaisFragil.area] ?? dados.areaMaisFragil.area)
              : 'Sem dados'
          }
          detalhe={
            dados.areaMaisFragil
              ? `${porcentagem(dados.areaMaisFragil.mediaAcertos)} de acerto`
              : 'Ainda não há respostas suficientes'
          }
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-semibold leading-[26px] text-ink">Por turma</h2>
        {dados.turmas.length === 0 ? (
          <EmptyState title="Nenhuma turma ativa">Crie uma turma na aba Turmas para começar.</EmptyState>
        ) : (
          <Table caption="Indicadores por turma" captionOculta className="min-w-[42rem]">
            <thead>
              <tr>
                <th scope="col">Turma</th>
                <th scope="col">Ano</th>
                <th scope="col" className="text-right">Alunos</th>
                <th scope="col" className="text-right">Sem acesso (7d)</th>
                <th scope="col" className="text-right">Pendentes</th>
                <th scope="col" className="text-right">Média XP</th>
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
        <p className="text-[12.5px] leading-[18px] text-ink-muted">
          Indicadores são por turma. A plataforma não compara nem classifica professores.
        </p>
      </section>
    </div>
  );
}
