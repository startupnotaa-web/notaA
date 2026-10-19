'use client';

import { useEffect, useState } from 'react';
import type { DetalheDoAluno, RedacaoDoAluno } from '@notaa/contracts';
import {
  Button,
  Carregando,
  Chip,
  Inset,
  Notice,
  PageHeader,
  Progress,
  Section,
  Skeleton,
  SummaryStrip,
} from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { SituacaoDoAluno } from './SituacaoDoAluno';

/**
 * Nível 3 do painel do professor: o aluno por dentro.
 *
 * Tudo aqui está recortado pela janela de dados — o servidor nem devolve o que
 * veio antes da aprovação. A tela diz a data de corte em vez de deixar o
 * professor achar que vê a vida escolar inteira do aluno.
 */

const ROTULO_AREA: Record<string, string> = {
  linguagens: 'Linguagens',
  humanas: 'Ciências Humanas',
  natureza: 'Ciências da Natureza',
  matematica: 'Matemática',
  redacao: 'Redação',
};

const COMPETENCIAS: Record<number, string> = {
  1: 'Domínio da norma culta',
  2: 'Compreensão do tema',
  3: 'Argumentação',
  4: 'Coesão e coerência',
  5: 'Proposta de intervenção',
};

function porcentagem(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function VisaoDoAluno({
  turmaId,
  estudanteId,
  onVoltar,
}: {
  turmaId: string;
  estudanteId: string;
  onVoltar: () => void;
}) {
  const [dados, setDados] = useState<DetalheDoAluno | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const resposta = await apiFetch<DetalheDoAluno>(`/turma/${turmaId}/alunos/${estudanteId}`);
        if (!cancelado) setDados(resposta);
      } catch (e) {
        if (!cancelado) {
          setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar o aluno.');
        }
      }
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, [turmaId, estudanteId]);

  if (erro) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={onVoltar}>
          Voltar
        </Button>
        <Notice tone="danger">{erro}</Notice>
      </div>
    );
  }

  if (!dados) {
    return (
      <Carregando rotulo="Carregando o aluno">
        <Skeleton className="h-64 w-full" />
      </Carregando>
    );
  }

  const maiorUso = Math.max(1, ...dados.usoPorSemana.map((s) => s.tentativas));

  return (
    <div className="flex flex-col gap-space-6 md:gap-space-7">
      <PageHeader
        title={dados.nome ?? 'Sem nome'}
        description={`${dados.turmaNome} · visível desde ${dataCurta(dados.visivelDesde)}`}
        status={<SituacaoDoAluno risco={dados.risco} />}
        actions={
          <Button variant="secondary" onClick={onVoltar}>
            Voltar
          </Button>
        }
      />
      <p className="m-0 -mt-space-4 text-body-sm text-ink-muted">{dados.motivo}</p>

      <SummaryStrip
        aria-label="Indicadores do aluno"
        items={[
          { id: 'xp', label: 'XP', value: dados.xpTotal.toLocaleString('pt-BR') },
          { id: 'of', label: 'Ofensiva', value: String(dados.streak) },
          { id: 'q', label: 'Questões', value: String(dados.totalTentativas) },
          {
            id: 'ult',
            label: 'Último acesso',
            value: dados.ultimoAcessoEm ? dataCurta(dados.ultimoAcessoEm) : 'Nunca',
          },
        ]}
      />

      <Section title="Desempenho por área">
        {dados.porArea.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">
            Nenhuma questão respondida desde a entrada na turma.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-space-5 p-0">
            {dados.porArea.map((a) => (
              <li key={a.area} className="flex flex-col gap-space-2">
                <div className="flex items-center justify-between gap-space-3">
                  <p className="m-0 text-body font-bold text-ink">
                    {ROTULO_AREA[a.area] ?? a.area}
                  </p>
                  <p className="m-0 text-body-sm tabular-nums text-ink-muted">
                    {a.acertos}/{a.tentativas} · {porcentagem(a.taxaAcerto)}
                  </p>
                </div>
                <Progress
                  value={Math.round(a.taxaAcerto * 100)}
                  max={100}
                  aria-label={`${porcentagem(a.taxaAcerto)} de acerto em ${ROTULO_AREA[a.area] ?? a.area}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Onde mais erra" divided>
        {dados.temasComErro.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">Nenhum padrão de erro registrado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-space-2">
            {dados.temasComErro.map((t) => (
              <Chip key={t.tema} tone="neutral">
                {t.tema} · {t.erros}
              </Chip>
            ))}
          </div>
        )}
      </Section>

      <Section title="Uso ao longo do tempo" divided>
        {dados.usoPorSemana.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">Sem atividade registrada.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <ul className="m-0 flex min-w-max list-none items-end gap-space-2 p-0">
                {dados.usoPorSemana.map((s) => (
                  <li key={s.semana} className="flex w-12 flex-col items-center gap-space-1">
                    <span className="text-caption tabular-nums text-ink-muted">{s.tentativas}</span>
                    <div
                      className="w-full rounded-t-sm bg-primary"
                      style={{ height: `${Math.max(4, (s.tentativas / maiorUso) * 96)}px` }}
                      role="img"
                      aria-label={`${s.tentativas} questões na semana de ${dataCurta(s.semana)}`}
                    />
                    <span className="text-caption text-ink-muted">
                      {new Date(s.semana).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="m-0 text-caption text-ink-muted">
              Questões respondidas por semana, da entrada na turma até hoje.
            </p>
          </>
        )}
      </Section>

      <Section title="Redações" divided>
        {dados.redacoes.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">
            Nenhuma redação enviada desde a entrada na turma.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {dados.redacoes.map((r) => (
              <li
                key={r.redacaoId}
                className="border-b border-line py-space-5 first:pt-0 last:border-b-0 last:pb-0"
              >
                <LinhaRedacao redacao={r} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** O texto da redação fica fechado por padrão: é produção pessoal, não métrica. */
function LinhaRedacao({ redacao }: { redacao: RedacaoDoAluno }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex flex-col gap-space-3">
      <div className="flex flex-wrap items-start justify-between gap-space-3">
        <div className="flex flex-col gap-space-1">
          <p className="m-0 text-body font-bold text-ink">{redacao.tema}</p>
          <p className="m-0 text-caption text-ink-muted">
            Enviada em {dataCurta(redacao.enviadoEm)}
          </p>
        </div>
        {redacao.notaTotal === null ? (
          <Chip tone="neutral">Em correção</Chip>
        ) : (
          <p className="m-0 font-display text-figure tabular-nums text-ink">{redacao.notaTotal}</p>
        )}
      </div>

      {redacao.competencias.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-space-1 p-0">
          {redacao.competencias.map((c) => (
            <li
              key={c.competencia}
              className="flex items-center justify-between gap-space-2 text-body-sm"
            >
              <span className="text-ink-muted">
                C{c.competencia} · {COMPETENCIAS[c.competencia] ?? ''}
              </span>
              <span className="font-bold tabular-nums text-ink">{c.nota}</span>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button variant="secondary" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
          {aberto ? 'Ocultar texto' : 'Ver texto da redação'}
        </Button>
      </div>

      {aberto && (
        <Inset className="whitespace-pre-wrap text-body-sm text-ink">{redacao.texto}</Inset>
      )}
    </div>
  );
}
