'use client';

import { useEffect, useState } from 'react';
import type { InstituicaoOverview } from '@notaa/contracts';
import { Badge, Card, CardHeader, Skeleton } from '@notaa/ui';
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{rotulo}</p>
        <p className="mt-1 text-3xl font-extrabold text-text">{valor}</p>
        {detalhe && <p className="mt-1 text-xs text-text-muted">{detalhe}</p>}
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
      <p role="alert" className="text-sm text-error">
        {erro}
      </p>
    );
  }

  if (!dados) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
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
        <h2 className="text-lg font-bold text-text">Por turma</h2>
        {dados.turmas.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nenhuma turma ativa. Crie uma turma na aba Turmas para começar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-3 py-2 font-semibold">Turma</th>
                  <th className="px-3 py-2 font-semibold">Ano</th>
                  <th className="px-3 py-2 font-semibold">Alunos</th>
                  <th className="px-3 py-2 font-semibold">Sem acesso (7d)</th>
                  <th className="px-3 py-2 font-semibold">Pendentes</th>
                  <th className="px-3 py-2 font-semibold">Média XP</th>
                  <th className="px-3 py-2 font-semibold">Área frágil</th>
                </tr>
              </thead>
              <tbody>
                {dados.turmas.map((t) => (
                  <tr key={t.turmaId} className="border-b border-border/50">
                    <td className="px-3 py-2 font-semibold text-text">{t.nome}</td>
                    <td className="px-3 py-2 text-text-muted">{t.anoLetivoRotulo}</td>
                    <td className="px-3 py-2 text-text">{t.alunosAtivos}</td>
                    <td className="px-3 py-2">
                      {t.alunosSemAcesso7d > 0 ? (
                        <Badge variant="neutral">{t.alunosSemAcesso7d}</Badge>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {t.solicitacoesPendentes > 0 ? (
                        <Badge variant="brand">{t.solicitacoesPendentes}</Badge>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text">{t.mediaXp.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 text-text-muted">
                      {t.areaMaisFragil
                        ? `${ROTULO_AREA[t.areaMaisFragil.area] ?? t.areaMaisFragil.area} · ${porcentagem(t.areaMaisFragil.mediaAcertos)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-text-muted">
          Indicadores são por turma. A plataforma não compara nem classifica professores.
        </p>
      </section>
    </div>
  );
}
