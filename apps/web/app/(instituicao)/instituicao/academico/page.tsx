'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnoLetivo } from '@notaa/contracts';
import { Card, CardDescription, CardHeader, CardTitle, SectionHeader, Select, Skeleton, cn } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { GestaoDeAnosLetivos } from '../../../components/painel/GestaoDeAnosLetivos';
import { Disciplinas } from './Disciplinas';
import { Periodos } from './Periodos';
import { RegraAvaliativa } from './RegraAvaliativa';

/**
 * Configuração acadêmica da instituição: ano letivo, períodos avaliativos,
 * disciplinas e a regra avaliativa. Períodos e regra são por ano letivo, por
 * isso o seletor de ano fica no topo e vale para as seções que dependem dele.
 */

const SECOES = [
  { id: 'ano', rotulo: 'Ano letivo' },
  { id: 'periodos', rotulo: 'Períodos' },
  { id: 'disciplinas', rotulo: 'Disciplinas' },
  { id: 'regra', rotulo: 'Regra avaliativa' },
] as const;
type Secao = (typeof SECOES)[number]['id'];

export default function ConfiguracaoAcademicaPage() {
  const [secao, setSecao] = useState<Secao>('periodos');
  const [anos, setAnos] = useState<AnoLetivo[] | null>(null);
  const [anoLetivoId, setAnoLetivoId] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);

  const carregarAnos = useCallback(async () => {
    try {
      const lista = await apiFetch<AnoLetivo[]>('/ano-letivo');
      setAnos(lista);
      setAnoLetivoId((atual) => {
        if (atual && lista.some((a) => a.id === atual)) return atual;
        const aberto = [...lista].reverse().find((a) => !a.arquivado);
        return aberto?.id ?? lista[lista.length - 1]?.id ?? '';
      });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os anos letivos.');
      setAnos([]);
    }
  }, []);

  useEffect(() => {
    void carregarAnos();
  }, [carregarAnos]);

  const anoSelecionado = anos?.find((a) => a.id === anoLetivoId) ?? null;
  const precisaDeAno = secao === 'periodos' || secao === 'regra';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <SectionHeader
        as="h1"
        title="Configuração acadêmica"
        description="Defina o calendário avaliativo, as disciplinas e como as notas viram média e situação final."
        action={
          anos && anos.length > 0 ? (
            <Select
              label="Ano letivo"
              className="w-56"
              value={anoLetivoId}
              onChange={(e) => setAnoLetivoId(e.target.value)}
              options={anos.map((a) => ({ value: a.id, label: `${a.rotulo}${a.arquivado ? ' (arquivado)' : ''}` }))}
            />
          ) : null
        }
      />

      {erro ? (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      ) : null}

      <div role="tablist" aria-label="Seções da configuração acadêmica" className="flex gap-1 overflow-x-auto border-b border-border">
        {SECOES.map((s) => (
          <button
            key={s.id}
            id={`aba-${s.id}`}
            type="button"
            role="tab"
            aria-selected={secao === s.id}
            aria-controls={secao === s.id ? `painel-${s.id}` : undefined}
            tabIndex={secao === s.id ? 0 : -1}
            onClick={() => setSecao(s.id)}
            onKeyDown={(e) => {
              // Padrão ARIA de abas: setas trocam de aba, Tab sai da lista.
              const i = SECOES.findIndex((x) => x.id === secao);
              const destino =
                e.key === 'ArrowRight' ? (i + 1) % SECOES.length
                : e.key === 'ArrowLeft' ? (i - 1 + SECOES.length) % SECOES.length
                : e.key === 'Home' ? 0
                : e.key === 'End' ? SECOES.length - 1
                : null;
              if (destino === null) return;
              e.preventDefault();
              setSecao(SECOES[destino]!.id);
              document.getElementById(`aba-${SECOES[destino]!.id}`)?.focus();
            }}
            className={cn(
              'min-h-[44px] whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
              secao === s.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      <section id={`painel-${secao}`} role="tabpanel" aria-labelledby={`aba-${secao}`}>
        {anos === null ? (
          <Skeleton className="h-48 w-full" />
        ) : secao === 'ano' ? (
          <GestaoDeAnosLetivos />
        ) : precisaDeAno && !anoSelecionado ? (
          <Card>
            <CardHeader>
              <CardTitle>Crie um ano letivo primeiro</CardTitle>
              <CardDescription>
                Períodos e regra avaliativa pertencem a um ano letivo. Cadastre o ano na aba “Ano letivo”.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : secao === 'periodos' && anoSelecionado ? (
          <Periodos anoLetivo={anoSelecionado} />
        ) : secao === 'disciplinas' ? (
          <Disciplinas />
        ) : anoSelecionado ? (
          <RegraAvaliativa anoLetivo={anoSelecionado} />
        ) : null}
      </section>
    </div>
  );
}
