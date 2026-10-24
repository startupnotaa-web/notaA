'use client';
// Tabela de dados para computador: ordenação por coluna, seleção em lote, colunas configuráveis,
// densidade (confortável ou compacta), cabeçalho e primeira coluna fixos, ações ao passar o mouse e
// navegação por teclado (setas, Home/End, Enter abre, Espaço marca). A página nunca rola de lado:
// a rolagem fica dentro do contêiner.
import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from 'lucide-react';
import { cn } from '../lib/cn';
import { EASE_OUT, FOCO } from '../lib/foco';

export interface ColunaDaTabela<T> {
  id: string;
  rotulo: string;
  celula: (linha: T) => React.ReactNode;
  /** Comparador para ordenar por esta coluna. Sem ele, a coluna não ordena. */
  ordenar?: (a: T, b: T) => number;
  alinhar?: 'esquerda' | 'direita';
  /** Largura mínima da coluna, em CSS (ex.: `12rem`). */
  largura?: string;
  /** Oculta por padrão; a pessoa liga em "Colunas". */
  ocultaPorPadrao?: boolean;
  /** Não pode ser ocultada (ex.: a coluna do nome). */
  obrigatoria?: boolean;
}

export type Densidade = 'confortavel' | 'compacta';

export interface DataTableProps<T> {
  /** Nome da tabela (legenda acessível). */
  caption: string;
  colunas: ColunaDaTabela<T>[];
  linhas: T[];
  idDaLinha: (linha: T) => string;
  /** Mostra a coluna de seleção em lote. */
  selecionavel?: boolean;
  selecionadas?: string[];
  onSelecionar?: (ids: string[]) => void;
  /** Enter na linha, ou clique no nome. */
  aoAbrir?: (linha: T) => void;
  /** Ações que aparecem ao passar o mouse ou focar a linha. */
  acoesDaLinha?: (linha: T) => React.ReactNode;
  /** Filtros e busca fixos no topo da tabela. */
  filtros?: React.ReactNode;
  /** Barra de ações em lote; só aparece com linhas selecionadas. */
  acoesEmLote?: (ids: string[]) => React.ReactNode;
  /** Mostrado quando não há linhas. */
  vazio?: React.ReactNode;
  densidadeInicial?: Densidade;
  /** Altura máxima da área da tabela (CSS). Padrão: preenche o pai. */
  alturaMaxima?: string;
  /** Linha com destaque (ex.: a que está aberta no painel lateral). */
  linhaAtiva?: string | null;
  className?: string;
}

type Ordem = { coluna: string; direcao: 'asc' | 'desc' } | null;

export function DataTable<T>({
  caption,
  colunas,
  linhas,
  idDaLinha,
  selecionavel = false,
  selecionadas = [],
  onSelecionar,
  aoAbrir,
  acoesDaLinha,
  filtros,
  acoesEmLote,
  vazio,
  densidadeInicial = 'confortavel',
  alturaMaxima,
  linhaAtiva = null,
  className,
}: DataTableProps<T>) {
  const id = React.useId();
  const [ordem, setOrdem] = React.useState<Ordem>(null);
  const [densidade, setDensidade] = React.useState<Densidade>(densidadeInicial);
  const [ocultas, setOcultas] = React.useState<Set<string>>(() => new Set(colunas.filter((c) => c.ocultaPorPadrao).map((c) => c.id)));
  const [menuColunas, setMenuColunas] = React.useState(false);
  const [foco, setFoco] = React.useState(0);
  const refsLinhas = React.useRef<(HTMLTableRowElement | null)[]>([]);

  const visiveis = colunas.filter((c) => !ocultas.has(c.id));

  const ordenadas = React.useMemo(() => {
    if (!ordem) return linhas;
    const col = colunas.find((c) => c.id === ordem.coluna);
    if (!col?.ordenar) return linhas;
    const cmp = col.ordenar;
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...linhas].sort((a, b) => sinal * cmp(a, b));
  }, [linhas, colunas, ordem]);

  const ids = ordenadas.map(idDaLinha);
  const todasMarcadas = ids.length > 0 && ids.every((i) => selecionadas.includes(i));
  const algumasMarcadas = !todasMarcadas && ids.some((i) => selecionadas.includes(i));

  const alternarOrdem = (coluna: string) =>
    setOrdem((atual) => {
      if (!atual || atual.coluna !== coluna) return { coluna, direcao: 'asc' };
      if (atual.direcao === 'asc') return { coluna, direcao: 'desc' };
      return null;
    });

  const marcar = (linhaId: string, marcada: boolean) =>
    onSelecionar?.(marcada ? [...selecionadas, linhaId] : selecionadas.filter((i) => i !== linhaId));

  const moverFoco = (para: number) => {
    const alvo = Math.max(0, Math.min(ordenadas.length - 1, para));
    setFoco(alvo);
    refsLinhas.current[alvo]?.focus();
  };

  const aoTeclarNaLinha = (e: React.KeyboardEvent<HTMLTableRowElement>, i: number, linha: T) => {
    // Teclas de controles dentro da linha (checkbox, botões) não devem virar navegação da tabela.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moverFoco(i + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moverFoco(i - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      moverFoco(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      moverFoco(ordenadas.length - 1);
    } else if (e.key === 'Enter' && aoAbrir) {
      e.preventDefault();
      aoAbrir(linha);
    } else if (e.key === ' ' && selecionavel) {
      e.preventDefault();
      const linhaId = idDaLinha(linha);
      marcar(linhaId, !selecionadas.includes(linhaId));
    }
  };

  const alturaLinha = densidade === 'compacta' ? '[&_td]:h-[var(--row-compact)]' : '[&_td]:h-[var(--row-comfortable)]';
  const padLinha = densidade === 'compacta' ? '[&_td]:py-1' : '[&_td]:py-2';
  const emLote = selecionadas.length > 0 && acoesEmLote;

  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface', className)}>
      <div className="flex flex-wrap items-center justify-between gap-space-3 border-b border-line p-space-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-space-3">{filtros}</div>
        <div className="flex flex-none items-center gap-space-2">
          <div role="radiogroup" aria-label="Densidade da tabela" className="inline-flex rounded-pill bg-surface-sunken p-0.5">
            {(['confortavel', 'compacta'] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={densidade === d}
                onClick={() => setDensidade(d)}
                className={cn(
                  'min-h-[36px] rounded-pill px-space-3 font-text text-caption font-bold',
                  `transition-colors duration-fast ${EASE_OUT}`,
                  FOCO,
                  densidade === d ? 'bg-surface text-primary' : 'text-ink-muted hover:text-ink',
                )}
              >
                {d === 'confortavel' ? 'Confortável' : 'Compacta'}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              type="button"
              aria-expanded={menuColunas}
              aria-controls={`${id}-colunas`}
              onClick={() => setMenuColunas((v) => !v)}
              className={cn(
                'inline-flex min-h-[36px] items-center gap-space-2 rounded-md border border-line-strong bg-surface px-space-3 font-text text-caption font-bold text-ink',
                `transition-colors duration-fast ${EASE_OUT}`,
                FOCO,
                'hover:bg-surface-sunken',
              )}
            >
              <Columns3 aria-hidden="true" className="h-4 w-4" />
              Colunas
            </button>
            {menuColunas ? (
              <fieldset
                id={`${id}-colunas`}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMenuColunas(false);
                }}
                className="absolute right-0 z-20 m-0 mt-space-2 flex min-w-[220px] flex-col gap-1 rounded-md border border-line bg-surface p-space-2 shadow-raise animate-[na-rise-in_240ms_var(--ease-out)] motion-reduce:animate-none"
              >
                <legend className="sr-only">Colunas visíveis</legend>
                {colunas.map((c) => (
                  <label key={c.id} className="flex min-h-[36px] items-center gap-space-3 px-space-2 font-text text-body-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={!ocultas.has(c.id)}
                      disabled={c.obrigatoria}
                      onChange={(e) =>
                        setOcultas((atual) => {
                          const novo = new Set(atual);
                          if (e.target.checked) novo.delete(c.id);
                          else novo.add(c.id);
                          return novo;
                        })
                      }
                    />
                    {c.rotulo}
                  </label>
                ))}
              </fieldset>
            ) : null}
          </div>
        </div>
      </div>

      {emLote ? (
        <div role="status" className="flex flex-wrap items-center gap-space-3 border-b border-line bg-violet-tint px-space-4 py-space-2">
          <span className="font-text text-label text-primary">
            {selecionadas.length} {selecionadas.length === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          {acoesEmLote(selecionadas)}
        </div>
      ) : null}

      <div tabIndex={0} role="region" aria-label={caption} className={cn('relative min-h-0 flex-1 overflow-auto', FOCO)} style={alturaMaxima ? { maxHeight: alturaMaxima } : undefined}>
        {ordenadas.length === 0 ? (
          <div className="p-space-6">{vazio}</div>
        ) : (
          <table className={cn('w-full border-collapse text-left font-text text-body-sm', alturaLinha, padLinha)}>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {selecionavel ? (
                  <th scope="col" className="sticky left-0 top-0 z-20 w-12 bg-surface-sunken px-space-3">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todas as linhas"
                      className="h-4 w-4 accent-primary"
                      checked={todasMarcadas}
                      ref={(el) => {
                        if (el) el.indeterminate = algumasMarcadas;
                      }}
                      onChange={(e) => onSelecionar?.(e.target.checked ? Array.from(new Set([...selecionadas, ...ids])) : selecionadas.filter((i) => !ids.includes(i)))}
                    />
                  </th>
                ) : null}
                {visiveis.map((c, ci) => {
                  const ativa = ordem?.coluna === c.id;
                  return (
                    <th
                      key={c.id}
                      scope="col"
                      aria-sort={ativa ? (ordem!.direcao === 'asc' ? 'ascending' : 'descending') : c.ordenar ? 'none' : undefined}
                      style={c.largura ? { minWidth: c.largura } : undefined}
                      className={cn(
                        'sticky top-0 bg-surface-sunken px-space-4 py-space-2 font-bold text-ink-muted',
                        ci === 0 ? 'left-0 z-20' : 'z-10',
                        ci === 0 && selecionavel && 'left-12',
                        c.alinhar === 'direita' && 'text-right',
                      )}
                    >
                      {c.ordenar ? (
                        <button
                          type="button"
                          onClick={() => alternarOrdem(c.id)}
                          className={cn('inline-flex min-h-[32px] items-center gap-space-1 rounded-sm font-bold hover:text-ink', FOCO)}
                        >
                          {c.rotulo}
                          {ativa ? (
                            ordem!.direcao === 'asc' ? <ArrowUp aria-hidden="true" className="h-4 w-4" /> : <ArrowDown aria-hidden="true" className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown aria-hidden="true" className="h-4 w-4 opacity-60" />
                          )}
                        </button>
                      ) : (
                        c.rotulo
                      )}
                    </th>
                  );
                })}
                {acoesDaLinha ? (
                  <th scope="col" className="sticky top-0 z-10 bg-surface-sunken px-space-4">
                    <span className="sr-only">Ações</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((linha, i) => {
                const linhaId = idDaLinha(linha);
                const marcada = selecionadas.includes(linhaId);
                return (
                  <tr
                    key={linhaId}
                    ref={(el) => {
                      refsLinhas.current[i] = el;
                    }}
                    tabIndex={i === foco ? 0 : -1}
                    aria-selected={selecionavel ? marcada : undefined}
                    aria-current={linhaAtiva === linhaId ? 'true' : undefined}
                    onFocus={(e) => {
                      if (e.target === e.currentTarget) setFoco(i);
                    }}
                    onKeyDown={(e) => aoTeclarNaLinha(e, i, linha)}
                    onDoubleClick={() => aoAbrir?.(linha)}
                    className={cn(
                      'group border-t border-line',
                      `transition-colors duration-fast ${EASE_OUT}`,
                      FOCO,
                      'hover:bg-paper focus-within:bg-paper',
                      (marcada || linhaAtiva === linhaId) && 'bg-violet-tint hover:bg-violet-tint',
                    )}
                  >
                    {selecionavel ? (
                      <td className="sticky left-0 z-10 w-12 bg-inherit px-space-3">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar linha ${i + 1}`}
                          className="h-4 w-4 accent-primary"
                          checked={marcada}
                          onChange={(e) => marcar(linhaId, e.target.checked)}
                        />
                      </td>
                    ) : null}
                    {visiveis.map((c, ci) => (
                      <td
                        key={c.id}
                        className={cn(
                          'px-space-4 align-middle',
                          ci === 0 && 'sticky z-10 bg-inherit font-bold text-ink',
                          ci === 0 && (selecionavel ? 'left-12' : 'left-0'),
                          c.alinhar === 'direita' && 'text-right tabular-nums',
                        )}
                      >
                        {ci === 0 && aoAbrir ? (
                          <button type="button" onClick={() => aoAbrir(linha)} className={cn('rounded-sm text-left font-bold text-ink hover:underline', FOCO)}>
                            {c.celula(linha)}
                          </button>
                        ) : (
                          c.celula(linha)
                        )}
                      </td>
                    ))}
                    {acoesDaLinha ? (
                      <td className="px-space-4 text-right">
                        <div className="inline-flex gap-space-1 opacity-0 transition-opacity duration-fast group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                          {acoesDaLinha(linha)}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
