'use client';

import { useEffect, useState } from 'react';
import type { DetalheDoAluno, RedacaoDoAluno } from '@notaa/contracts';
import { Chip, Button, Card, CardHeader, Skeleton, Notice } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { RiskBadge } from './RiskBadge';

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
        const resposta = await apiFetch<DetalheDoAluno>(
          `/turma/${turmaId}/alunos/${estudanteId}`,
        );
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

  if (!dados) return <Skeleton className="h-64 w-full rounded-lg" />;

  const maiorUso = Math.max(1, ...dados.usoPorSemana.map((s) => s.tentativas));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-[32px] font-semibold leading-10 tracking-[-0.01em] text-ink">{dados.nome ?? 'Sem nome'}</h1>
          <p className="text-sm text-ink-muted">
            {dados.turmaNome} · visível desde {dataCurta(dados.visivelDesde)}
          </p>
        </div>
        <Button variant="secondary" onClick={onVoltar}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { rotulo: 'XP', valor: dados.xpTotal.toLocaleString('pt-BR') },
          { rotulo: 'Ofensiva', valor: String(dados.streak) },
          { rotulo: 'Questões', valor: String(dados.totalTentativas) },
          {
            rotulo: 'Último acesso',
            valor: dados.ultimoAcessoEm ? dataCurta(dados.ultimoAcessoEm) : 'Nunca',
          },
        ].map((i) => (
          <Card key={i.rotulo}>
            <CardHeader>
              <p className="text-[12.5px] font-bold text-ink-muted">
                {i.rotulo}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{i.valor}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">Situação</p>
            <RiskBadge risco={dados.risco} />
            <span className="text-sm text-ink-muted">{dados.motivo}</span>
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-semibold leading-[26px] text-ink">Desempenho por área</h2>
        {dados.porArea.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhuma questão respondida desde a entrada na turma.
          </p>
        ) : (
          <ul className="space-y-2">
            {dados.porArea.map((a) => (
              <li key={a.area}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {ROTULO_AREA[a.area] ?? a.area}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {a.acertos}/{a.tentativas} · {porcentagem(a.taxaAcerto)}
                      </p>
                    </div>
                    <div
                      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
                      role="img"
                      aria-label={`${porcentagem(a.taxaAcerto)} de acerto em ${ROTULO_AREA[a.area] ?? a.area}`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(a.taxaAcerto * 100)}%` }}
                      />
                    </div>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-semibold leading-[26px] text-ink">Onde mais erra</h2>
        {dados.temasComErro.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum padrão de erro registrado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dados.temasComErro.map((t) => (
              <Chip key={t.tema} tone="neutral">
                {t.tema} · {t.erros}
              </Chip>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-semibold leading-[26px] text-ink">Uso ao longo do tempo</h2>
        {dados.usoPorSemana.length === 0 ? (
          <p className="text-sm text-ink-muted">Sem atividade registrada.</p>
        ) : (
          <Card>
            <CardHeader>
              <div className="overflow-x-auto">
                <ul className="flex min-w-max items-end gap-2">
                  {dados.usoPorSemana.map((s) => (
                    <li key={s.semana} className="flex w-12 flex-col items-center gap-1">
                      <span className="text-[12.5px] text-ink-muted">{s.tentativas}</span>
                      <div
                        className="w-full rounded-t bg-primary"
                        style={{ height: `${Math.max(4, (s.tentativas / maiorUso) * 96)}px` }}
                        role="img"
                        aria-label={`${s.tentativas} questões na semana de ${dataCurta(s.semana)}`}
                      />
                      <span className="text-[12.5px] text-ink-muted">
                        {new Date(s.semana).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-[12.5px] leading-[18px] text-ink-muted">
                Questões respondidas por semana, da entrada na turma até hoje.
              </p>
            </CardHeader>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-semibold leading-[26px] text-ink">Redações</h2>
        {dados.redacoes.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhuma redação enviada desde a entrada na turma.
          </p>
        ) : (
          <ul className="space-y-3">
            {dados.redacoes.map((r) => (
              <li key={r.redacaoId}>
                <CartaoRedacao redacao={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** O texto da redação fica fechado por padrão: é produção pessoal, não métrica. */
function CartaoRedacao({ redacao }: { redacao: RedacaoDoAluno }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold text-ink">{redacao.tema}</p>
            <p className="text-[12.5px] leading-[18px] text-ink-muted">Enviada em {dataCurta(redacao.enviadoEm)}</p>
          </div>
          {redacao.notaTotal === null ? (
            <Chip tone="neutral">Em correção</Chip>
          ) : (
            <p className="text-2xl font-extrabold text-ink">{redacao.notaTotal}</p>
          )}
        </div>

        {redacao.competencias.length > 0 && (
          <ul className="mt-3 space-y-1">
            {redacao.competencias.map((c) => (
              <li key={c.competencia} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-muted">
                    C{c.competencia} · {COMPETENCIAS[c.competencia] ?? ''}
                  </span>
                  <span className="font-semibold text-ink">{c.nota}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <Button variant="secondary" onClick={() => setAberto(!aberto)}>
            {aberto ? 'Ocultar texto' : 'Ver texto da redação'}
          </Button>
        </div>

        {aberto && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-line bg-surface-sunken p-3 text-sm leading-relaxed text-ink">
            {redacao.texto}
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
