'use client';
// Relatório pós-prova — é aqui, e só aqui, que o aluno descobre o que acertou
// (o simulado não dá feedback por questão, diferente do quiz).

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, CircleCheck, Clock, Flame, Target, TrendingUp } from 'lucide-react';
import type { SimuladoRecorte, SimuladoRelatorio } from '@notaa/contracts';
import { Button, ButtonLink, Chip, Notice, OptionCard, PageHeader, Progress, Section, SummaryStrip, cn } from '@notaa/ui';
import { Pagina } from '../../components/Pagina';
import { formatarDuracao, rotuloArea, rotuloDificuldade } from './labels';

/** Um comentário por faixa — o número sozinho não diz ao aluno o que fazer. */
function leituraDoDesempenho(percentual: number): string {
  if (percentual >= 80) return 'Desempenho de quem já está pronto para a prova. Mantenha o ritmo.';
  if (percentual >= 60) return 'Base sólida. O que separa você da faixa de cima são as questões difíceis.';
  if (percentual >= 40) return 'Você acerta o que domina — falta ampliar o alcance do conteúdo.';
  return 'Comece pelo básico de cada área antes de voltar ao simulado completo.';
}

function BarraRecorte({
  recortes,
  rotular,
}: {
  recortes: SimuladoRecorte[];
  rotular: (chave: string) => string;
}) {
  return (
    <div className="flex flex-col gap-space-4">
      {recortes.map((r) => (
        <div key={r.chave} className="flex flex-col gap-space-2">
          <div className="flex items-baseline justify-between gap-2 text-body-sm">
            <span className="font-bold text-ink">{rotular(r.chave)}</span>
            <span className="tabular-nums text-ink-muted">
              {r.acertos}/{r.total} · {r.percentual}%
            </span>
          </div>
          <Progress
            value={r.acertos}
            max={r.total}
            aria-label={`${rotular(r.chave)}: ${r.acertos} de ${r.total}`}
          />
        </div>
      ))}
    </div>
  );
}

export function RelatorioSimulado({
  relatorio,
  onRefazer,
}: {
  relatorio: SimuladoRelatorio;
  onRefazer: () => void;
}) {
  const [revisaoAberta, setRevisaoAberta] = useState(false);

  const erradas = relatorio.questoes.filter((q) => !q.acerto);
  // "Pontos a melhorar" = onde o aluno mais perdeu questão, não onde tem o pior
  // percentual: 3 erros em 10 pesam mais na nota do que 1 erro em 2.
  const dificuldadesFracas = [...relatorio.porDificuldade]
    .filter((d) => d.total > 0 && d.percentual < 60)
    .sort((a, b) => a.percentual - b.percentual);

  return (
    <Pagina>
      <PageHeader title="Simulado concluído" description={leituraDoDesempenho(relatorio.percentual)} />

      <SummaryStrip
        aria-label="Resultado do simulado"
        items={[
          {
            id: 'acertos',
            label: 'Acertos',
            value: `${relatorio.acertos}/${relatorio.total}`,
            hint: `${relatorio.emBranco} em branco`,
          },
          { id: 'aproveitamento', label: 'Aproveitamento', value: `${relatorio.percentual}%` },
          {
            id: 'tempo',
            label: 'Tempo',
            value: formatarDuracao(relatorio.duracaoSegundos),
            hint: relatorio.expirado ? 'Tempo esgotado' : undefined,
          },
          {
            id: 'xp',
            label: 'XP',
            value: relatorio.xpGanho > 0 ? `+${relatorio.xpGanho}` : '0',
            hint: relatorio.modo === 'cronometrado' ? `${relatorio.limiteMinutos} min` : 'Modo livre',
          },
        ]}
      />

      {relatorio.xpBloqueadoPorDesempenho && (
        <Notice tone="info">
          No modo livre o XP só é liberado acima de 70% de acerto. Você ficou em {relatorio.percentual}%. Refaça
          cronometrado para valer mais.
        </Notice>
      )}

      <div className="grid gap-space-7 md:grid-cols-2">
        <Section title="Por área" as="h2" divided>
          <BarraRecorte recortes={relatorio.porArea} rotular={rotuloArea} />
        </Section>
        <Section title="Por dificuldade" as="h2" divided>
          <BarraRecorte recortes={relatorio.porDificuldade} rotular={rotuloDificuldade} />
        </Section>
      </div>

      <Section title="Pontos a melhorar" divided>
        <ul className="m-0 flex list-none flex-col gap-space-4 p-0 text-body text-ink">
          {relatorio.melhorArea && (
            <li className="flex gap-space-3">
              <CircleCheck aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-success" />
              <span>
                Seu ponto forte é <strong>{rotuloArea(relatorio.melhorArea)}</strong>. Use essa área para garantir
                tempo para as outras.
              </span>
            </li>
          )}
          {relatorio.areaAMelhorar && relatorio.areaAMelhorar !== relatorio.melhorArea && (
            <li className="flex gap-space-3">
              <Target aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-primary" />
              <span>
                <strong>{rotuloArea(relatorio.areaAMelhorar)}</strong> foi onde você mais perdeu pontos. Comece o
                estudo por aqui.
              </span>
            </li>
          )}
          {dificuldadesFracas.map((d) => (
            <li key={d.chave} className="flex gap-space-3">
              <TrendingUp aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-primary" />
              <span>
                Nas questões de nível <strong>{rotuloDificuldade(d.chave).toLowerCase()}</strong> você acertou{' '}
                {d.acertos} de {d.total}. Treinar esse nível é o caminho mais curto para subir a nota.
              </span>
            </li>
          ))}
          {relatorio.emBranco > 0 && (
            <li className="flex gap-space-3">
              <Clock aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-warning" />
              <span>
                {relatorio.emBranco}{' '}
                {relatorio.emBranco === 1 ? 'questão ficou em branco' : 'questões ficaram em branco'} e contam como
                erro. Na prova real, chutar vale mais que deixar vazio.
              </span>
            </li>
          )}
          {dificuldadesFracas.length === 0 && relatorio.emBranco === 0 && (
            <li className="flex gap-space-3">
              <Flame aria-hidden="true" className="mt-1 h-5 w-5 flex-none text-primary" />
              <span>Nenhum ponto crítico neste simulado. Aumente a dificuldade reduzindo o tempo.</span>
            </li>
          )}
        </ul>
      </Section>

      <Section divided>
        <button
          type="button"
          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md text-left"
          onClick={() => setRevisaoAberta((v) => !v)}
          aria-expanded={revisaoAberta}
        >
          <span className="font-display text-heading-3 text-ink">
            Revisar questões{' '}
            <span className="font-text text-body font-normal text-ink-muted">
              ({erradas.length} {erradas.length === 1 ? 'erro' : 'erros'})
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn('h-5 w-5 text-ink-muted transition-transform duration-base ease-out', revisaoAberta && 'rotate-180')}
          />
        </button>

        {revisaoAberta && (
          <ol className="m-0 flex list-none flex-col gap-space-6 p-0">
            {relatorio.questoes.map((q) => (
              <li key={q.itemId} className="flex flex-col gap-space-3 border-t border-line pt-space-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="neutral">Questão {q.ordem}</Chip>
                  <Chip tone="info">{rotuloArea(q.area)}</Chip>
                  <Chip tone="neutral">{rotuloDificuldade(q.dificuldade)}</Chip>
                  <Chip tone={q.acerto ? 'success' : 'danger'}>
                    {q.acerto ? 'Acertou' : q.respostaDada == null ? 'Em branco' : 'Errou'}
                  </Chip>
                </div>
                <p className="m-0 max-w-texto whitespace-pre-line text-body">{q.enunciado}</p>
                <div className="flex flex-col gap-space-2">
                  {q.alternativas.map((a) => (
                    <OptionCard
                      key={a.id}
                      leading={a.id}
                      title={a.texto}
                      state={
                        a.id === q.gabarito
                          ? 'correct'
                          : a.id === q.respostaDada
                            ? 'incorrect'
                            : 'neutral'
                      }
                      selected={a.id === q.respostaDada}
                      disabled
                      className={cn(a.id !== q.gabarito && a.id !== q.respostaDada && 'opacity-70')}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <div className="flex flex-wrap gap-space-3">
        <Button variant="primary" onClick={onRefazer}>
          Fazer outro simulado
        </Button>
        <ButtonLink as={Link} href="/dashboard" variant="secondary">
          Voltar ao início
        </ButtonLink>
      </div>
    </Pagina>
  );
}
