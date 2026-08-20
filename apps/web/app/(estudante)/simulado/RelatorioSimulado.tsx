'use client';
// Relatório pós-prova — é aqui, e só aqui, que o aluno descobre o que acertou
// (o simulado não dá feedback por questão, diferente do quiz).

import { useState } from 'react';
import Link from 'next/link';
import type { SimuladoRecorte, SimuladoRelatorio } from '@notaa/contracts';
import { Badge, Button, Card, OptionCard, Progress, Stat, cn } from '@notaa/ui';
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
    <div className="space-y-3">
      {recortes.map((r) => (
        <div key={r.chave} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{rotular(r.chave)}</span>
            <span className="text-text-muted">
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
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <Card variant="highlight" className="space-y-5 p-6 text-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold">Simulado concluído</h1>
          <p className="text-text-muted">{leituraDoDesempenho(relatorio.percentual)}</p>
        </div>

        <div className="flex items-end justify-center gap-2">
          <span className="text-6xl font-black text-brand-primary">{relatorio.acertos}</span>
          <span className="pb-2 text-2xl font-semibold text-text-muted">/ {relatorio.total}</span>
        </div>
        <Progress value={relatorio.acertos} max={relatorio.total} gradient aria-label="Acertos" />

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <Stat label="Aproveitamento" value={`${relatorio.percentual}%`} />
          <Stat label="Em branco" value={relatorio.emBranco} />
          <Stat
            label="Tempo"
            value={formatarDuracao(relatorio.duracaoSegundos)}
            hint={relatorio.expirado ? 'tempo esgotado' : undefined}
          />
          <Stat
            label="XP"
            value={relatorio.xpGanho > 0 ? `+${relatorio.xpGanho}` : '0'}
            hint={
              relatorio.modo === 'cronometrado'
                ? `${relatorio.limiteMinutos} min`
                : 'modo livre'
            }
          />
        </div>

        {relatorio.xpBloqueadoPorDesempenho && (
          <p className="rounded-xl border border-border bg-surface p-3 text-sm text-text-muted">
            No modo livre o XP só é liberado acima de 70% de acerto. Você ficou em{' '}
            {relatorio.percentual}% — refaça cronometrado para valer mais.
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="font-bold">Por área</h2>
          <BarraRecorte recortes={relatorio.porArea} rotular={rotuloArea} />
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-bold">Por dificuldade</h2>
          <BarraRecorte recortes={relatorio.porDificuldade} rotular={rotuloDificuldade} />
        </Card>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="font-bold">Pontos a melhorar</h2>
        <ul className="space-y-2 text-sm">
          {relatorio.melhorArea && (
            <li className="flex gap-2">
              <span aria-hidden>✅</span>
              <span>
                Seu ponto forte é <strong>{rotuloArea(relatorio.melhorArea)}</strong>. Use essa área
                para garantir tempo para as outras.
              </span>
            </li>
          )}
          {relatorio.areaAMelhorar && relatorio.areaAMelhorar !== relatorio.melhorArea && (
            <li className="flex gap-2">
              <span aria-hidden>🎯</span>
              <span>
                <strong>{rotuloArea(relatorio.areaAMelhorar)}</strong> foi onde você mais perdeu
                pontos — comece o estudo por aqui.
              </span>
            </li>
          )}
          {dificuldadesFracas.map((d) => (
            <li key={d.chave} className="flex gap-2">
              <span aria-hidden>📈</span>
              <span>
                Nas questões de nível <strong>{rotuloDificuldade(d.chave).toLowerCase()}</strong> você
                acertou {d.acertos} de {d.total}. Treinar esse nível é o caminho mais curto para subir
                a nota.
              </span>
            </li>
          ))}
          {relatorio.emBranco > 0 && (
            <li className="flex gap-2">
              <span aria-hidden>⏱️</span>
              <span>
                {relatorio.emBranco}{' '}
                {relatorio.emBranco === 1 ? 'questão ficou em branco' : 'questões ficaram em branco'}{' '}
                e contam como erro. Na prova real, chutar vale mais que deixar vazio.
              </span>
            </li>
          )}
          {dificuldadesFracas.length === 0 && relatorio.emBranco === 0 && (
            <li className="flex gap-2">
              <span aria-hidden>🔥</span>
              <span>Nenhum ponto crítico neste simulado. Aumente a dificuldade reduzindo o tempo.</span>
            </li>
          )}
        </ul>
      </Card>

      <Card className="space-y-4 p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setRevisaoAberta((v) => !v)}
          aria-expanded={revisaoAberta}
        >
          <span className="font-bold">
            Revisar questões{' '}
            <span className="font-normal text-text-muted">
              ({erradas.length} {erradas.length === 1 ? 'erro' : 'erros'})
            </span>
          </span>
          <span aria-hidden className="text-text-muted">
            {revisaoAberta ? '▲' : '▼'}
          </span>
        </button>

        {revisaoAberta && (
          <ol className="space-y-6">
            {relatorio.questoes.map((q) => (
              <li key={q.itemId} className="space-y-3 border-t border-border pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">Questão {q.ordem}</Badge>
                  <Badge variant="info">{rotuloArea(q.area)}</Badge>
                  <Badge variant="neutral">{rotuloDificuldade(q.dificuldade)}</Badge>
                  <Badge variant={q.acerto ? 'success' : 'error'}>
                    {q.acerto ? 'Acertou' : q.respostaDada == null ? 'Em branco' : 'Errou'}
                  </Badge>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed">{q.enunciado}</p>
                <div className="space-y-2">
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
                      className={cn(
                        a.id !== q.gabarito && a.id !== q.respostaDada && 'opacity-70',
                      )}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="flex flex-wrap justify-center gap-3 pb-8">
        <Button asChild variant="secondary" size="lg">
          <Link href="/dashboard">Voltar ao início</Link>
        </Button>
        <Button variant="cta" size="lg" onClick={onRefazer}>
          Fazer outro simulado
        </Button>
      </div>
    </div>
  );
}
