'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnoLetivo } from '@notaa/contracts';
import { Card, CardDescription, CardHeader, CardTitle, SectionHeader, Select, Skeleton, Tabs, propsDoPainel, Notice } from '@notaa/ui';
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
    <div className="space-y-6">
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
        <Notice tone="danger">{erro}</Notice>
      ) : null}

      <Tabs
        label="Seções da configuração acadêmica"
        idBase="config"
        tabs={SECOES.map((s) => ({ id: s.id, label: s.rotulo }))}
        value={secao}
        onChange={(id) => setSecao(id as Secao)}
      />

      <section {...propsDoPainel('config', secao)}>
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
