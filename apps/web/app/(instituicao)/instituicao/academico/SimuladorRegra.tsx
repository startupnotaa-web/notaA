'use client';

import { useEffect, useState } from 'react';
import {
  quantidadeDePeriodos,
  type AlunoSimulado,
  type NotaLancada,
  type RegraAvaliativa,
  type SimularRegraResponse,
} from '@notaa/contracts';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, Notice, TextField } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { formatarNota, SITUACAO } from './regra';

interface AlunoDeExemplo {
  rotulo: string;
  /** Uma caixa por período: notas separadas por espaço ou ";", com vírgula decimal. */
  notas: string[];
  frequencia: string;
  recuperacaoFinal: string;
  conselhoAprova: boolean;
}

const EXEMPLOS: AlunoDeExemplo[] = [
  { rotulo: 'Ana', notas: ['7 8', '6,5', '8', '9'], frequencia: '95', recuperacaoFinal: '', conselhoAprova: false },
  { rotulo: 'Bruno', notas: ['4 5', '5', '6', '5,5'], frequencia: '88', recuperacaoFinal: '7', conselhoAprova: false },
  { rotulo: 'Carla', notas: ['9', '9', '8,5', '10'], frequencia: '70', recuperacaoFinal: '', conselhoAprova: false },
];

function lerNotas(texto: string): NotaLancada[] {
  return texto
    .split(/[\s;]+/)
    .filter(Boolean)
    .map((t) => (/^\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : t));
}

function paraRequisicao(a: AlunoDeExemplo, periodos: number): AlunoSimulado {
  const rec = a.recuperacaoFinal.trim();
  return {
    rotulo: a.rotulo,
    notasPorPeriodo: Array.from({ length: periodos }, (_, i) => lerNotas(a.notas[i] ?? '')),
    frequencia: Math.min(Math.max(Number(a.frequencia.replace(',', '.')) / 100 || 0, 0), 1),
    recuperacaoFinal: rec ? Number(rec.replace(',', '.')) : null,
    decisaoConselho: a.conselhoAprova ? 'aprovar' : null,
  };
}

/**
 * Simulador ao lado do formulário: alunos de exemplo passam pela regra que
 * está sendo editada. O cálculo é do servidor (`POST /academico/regras/simular`),
 * o mesmo motor que vai valer de verdade; nada é gravado.
 */
export function SimuladorRegra({ regra, valida }: { regra: RegraAvaliativa; valida: boolean }) {
  const [alunos, setAlunos] = useState<AlunoDeExemplo[]>(EXEMPLOS);
  const [resultado, setResultado] = useState<SimularRegraResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const periodos = quantidadeDePeriodos(regra.regime);

  useEffect(() => {
    if (!valida) return;
    const corpo = { regra, alunos: alunos.map((a) => paraRequisicao(a, periodos)) };
    // Espera a pessoa parar de digitar antes de chamar o servidor.
    const espera = setTimeout(() => {
      apiFetch<SimularRegraResponse>('/academico/regras/simular', { method: 'POST', body: JSON.stringify(corpo) })
        .then((r) => {
          setResultado(r);
          setErro(null);
        })
        .catch((e) => setErro(e instanceof ApiError ? e.message : 'Não foi possível simular.'));
    }, 400);
    return () => clearTimeout(espera);
  }, [regra, alunos, periodos, valida]);

  function mudar(i: number, parcial: Partial<AlunoDeExemplo>) {
    setAlunos((lista) => lista.map((a, j) => (j === i ? { ...a, ...parcial } : a)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador</CardTitle>
        <CardDescription>
          Mude as notas para ver médias e situação com a regra ao lado. Nada é salvo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!valida ? (
          <p className="rounded-md border border-warning p-3 text-sm text-ink">
            Corrija os campos da regra para ver a simulação.
          </p>
        ) : erro ? (
          <Notice tone="danger">{erro}</Notice>
        ) : null}

        {/* Um anúncio só, com a situação de cada aluno, em vez de três regiões
            vivas falando a cada tecla. */}
        <p aria-live="polite" className="sr-only">
          {resultado
            ? `Simulação atualizada. ${resultado.resultados
                .map((r) => `${r.rotulo}: ${r.erro ? 'entrada inválida' : SITUACAO[r.situacao].rotulo}`)
                .join('. ')}.`
            : ''}
        </p>
        {alunos.map((a, i) => {
          const r = resultado?.resultados[i];
          const situacao = r && !r.erro ? SITUACAO[r.situacao] : null;
          return (
            <fieldset key={i} className="space-y-3 rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-semibold text-ink">{a.rotulo}</legend>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: periodos }, (_, p) => (
                  <TextField
                    key={p}
                    label={`Notas do ${p + 1}º período`}
                    id={`sim-${i}-${p}`}
                    value={a.notas[p] ?? ''}
                    onChange={(e) => {
                      const notas = [...a.notas];
                      notas[p] = e.target.value;
                      mudar(i, { notas });
                    }}
                  />
                ))}
                <TextField
                  label="Frequência (%)"
                  id={`sim-${i}-freq`}
                  inputMode="decimal"
                  value={a.frequencia}
                  onChange={(e) => mudar(i, { frequencia: e.target.value })}
                />
                {regra.recuperacao.final ? (
                  <TextField
                    label="Nota da final"
                    id={`sim-${i}-rec`}
                    inputMode="decimal"
                    value={a.recuperacaoFinal}
                    onChange={(e) => mudar(i, { recuperacaoFinal: e.target.value })}
                  />
                ) : null}
              </div>
              {regra.conselhoDeClasse.habilitado ? (
                <label className="flex min-h-[44px] items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={a.conselhoAprova}
                    onChange={(e) => mudar(i, { conselhoAprova: e.target.checked })}
                    className="h-5 w-5 accent-primary"
                  />
                  Conselho decide aprovar
                </label>
              ) : null}

              <div className="space-y-1 border-t border-line pt-2 text-sm">
                {r?.erro ? (
                  <p className="text-danger">{r.erro}</p>
                ) : r ? (
                  <>
                    <p className="text-ink-muted">
                      Períodos: <span className="text-ink">{r.notasPeriodo.map(formatarNota).join(' · ')}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-ink-muted">Média final</span>
                      <strong className="text-lg text-ink">{formatarNota(r.mediaFinal)}</strong>
                      {r.conceito ? <span className="text-ink">({r.conceito})</span> : null}
                      {r.mediaAposRecuperacao !== null ? (
                        <span className="text-ink-muted">→ {formatarNota(r.mediaAposRecuperacao)} após a final</span>
                      ) : null}
                    </p>
                    {situacao ? <Chip tone={situacao.variante}>{situacao.rotulo}</Chip> : null}
                  </>
                ) : (
                  <p className="text-ink-muted">Calculando…</p>
                )}
              </div>
            </fieldset>
          );
        })}
        <Button variant="quiet" onClick={() => setAlunos(EXEMPLOS)}>
          Restaurar exemplos
        </Button>
      </CardContent>
    </Card>
  );
}
