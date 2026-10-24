'use client';
import * as React from 'react';
import { cn } from '../lib/cn';
import { FOCO } from '../lib/foco';
import { StatusIcon } from './StatusIcon';

export interface GradeGridProps {
  columns: { id: string; label: string; weight?: number }[];
  rows: { id: string; name: string; grades: Record<string, number | string> }[];
  min?: number;
  max?: number;
  /** Média mínima de aprovação; abaixo dela a média aparece em danger com texto. */
  passing?: number;
  caption?: React.ReactNode;
  nameLabel?: string;
  averageLabel?: string;
  onChange?: (rowId: string, columnId: string, value: string) => void;
}

type Notas = Record<string, Record<string, number | string>>;

const virgula = (n: number) => n.toFixed(1).replace('.', ',');
const mostrar = (n: number | null) => (n == null || Number.isNaN(n) ? '–' : virgula(n));

function lerNumero(v: number | string | undefined): number | null {
  if (v === undefined || v === '') return null;
  return Number(String(v).replace(',', '.'));
}

const notasDasLinhas = (rows: GradeGridProps['rows']): Notas =>
  Object.fromEntries(rows.map((r) => [r.id, { ...r.grades }]));

/**
 * Grade de notas editável. A média mostrada é só exibição (média ponderada simples das colunas
 * preenchidas); a regra oficial de nota do período vive em @notaa/engine-grading.
 */
export function GradeGrid({
  columns,
  rows,
  min = 0,
  max = 10,
  passing = 6,
  caption,
  nameLabel = 'Aluno',
  averageLabel = 'Média',
  onChange,
}: GradeGridProps) {
  const [notas, setNotas] = React.useState<Notas>(() => notasDasLinhas(rows));

  // Ressincroniza quando os dados que chegam de fora mudam de verdade. A assinatura
  // evita zerar o que a pessoa digita só porque o pai recriou o array a cada render.
  const assinatura = JSON.stringify(rows);
  const anterior = React.useRef(assinatura);
  React.useEffect(() => {
    if (anterior.current === assinatura) return;
    anterior.current = assinatura;
    setNotas(notasDasLinhas(rows));
  }, [assinatura, rows]);

  const editar = (linha: string, coluna: string, valor: string) => {
    setNotas((atual) => ({ ...atual, [linha]: { ...atual[linha], [coluna]: valor } }));
    onChange?.(linha, coluna, valor);
  };

  const media = (linha: string): number | null => {
    let soma = 0;
    let pesos = 0;
    for (const c of columns) {
      const n = lerNumero(notas[linha]?.[c.id]);
      if (n != null && !Number.isNaN(n)) {
        const peso = c.weight ?? 1;
        soma += n * peso;
        pesos += peso;
      }
    }
    return pesos ? soma / pesos : null;
  };

  const celula = 'px-2 py-1 text-right text-ink border-b border-line whitespace-nowrap';

  return (
    // Região rolável: foco por teclado para rolar sem mouse (WCAG 2.1.1).
    <div
      tabIndex={0}
      role="region"
      aria-label={typeof caption === 'string' ? caption : 'Grade de notas'}
      className={cn('relative max-w-full overflow-auto rounded-lg border border-line bg-surface', FOCO)}
    >
      <table className="min-w-full border-separate border-spacing-0 font-text text-sm leading-[22px]">
        {caption ? (
          <caption className="caption-bottom border-t border-line px-4 py-3 text-left text-sm text-ink-muted">{caption}</caption>
        ) : null}
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-[3] whitespace-nowrap border-b border-line bg-surface-sunken px-4 py-3 text-left font-bold text-ink-muted"
            >
              {nameLabel}
            </th>
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="sticky top-0 z-[1] whitespace-nowrap border-b border-line bg-surface-sunken px-4 py-3 text-right font-bold text-ink-muted"
              >
                {c.label}
                {c.weight ? <small className="block text-[12.5px] font-normal leading-[18px]">peso {c.weight}</small> : null}
              </th>
            ))}
            <th
              scope="col"
              className="sticky top-0 z-[1] whitespace-nowrap border-b border-line bg-surface-sunken px-4 py-3 text-right font-bold text-ink-muted"
            >
              {averageLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const m = media(r.id);
            const baixa = m != null && m < passing;
            return (
              <tr key={r.id} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-[2] whitespace-nowrap border-b border-line bg-surface px-4 py-3 text-left font-bold text-ink group-last:border-b-0"
                >
                  {r.name}
                </th>
                {columns.map((c) => {
                  const bruto = notas[r.id]?.[c.id];
                  const n = lerNumero(bruto);
                  const invalida = n != null && (Number.isNaN(n) || n < min || n > max);
                  const avisoId = `${r.id}-${c.id}-aviso`;
                  return (
                    <td key={c.id} className={cn(celula, 'group-last:border-b-0 transition-colors duration-fast ease-out group-hover:bg-paper')}>
                      <span className="inline-flex items-center gap-1">
                        {invalida ? <StatusIcon tone="danger" className="h-4 w-4 flex-none text-danger" /> : null}
                        <input
                          inputMode="decimal"
                          value={bruto == null ? '' : String(bruto).replace('.', ',')}
                          aria-label={`${c.label}, ${r.name}`}
                          aria-invalid={invalida ? true : undefined}
                          aria-describedby={invalida ? avisoId : undefined}
                          onChange={(e) => editar(r.id, c.id, e.target.value)}
                          className={cn(
                            'w-16 rounded-sm border bg-transparent p-2 text-right font-display text-[15px] font-semibold leading-5 tabular-nums text-ink',
                            FOCO,
                            invalida ? 'border-2 border-danger bg-danger-tint' : 'border-transparent hover:border-line',
                          )}
                        />
                      </span>
                      {invalida ? (
                        <span id={avisoId} className="sr-only">
                          Use um valor entre {min} e {max}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    'border-b border-line px-4 py-3 text-right font-display text-[15px] font-semibold leading-5 tabular-nums group-last:border-b-0',
                    baixa ? 'text-danger' : 'text-ink',
                  )}
                >
                  {mostrar(m)}
                  {baixa ? <span className="block font-text text-[12.5px] font-normal leading-[18px] text-danger">abaixo de {virgula(passing)}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
