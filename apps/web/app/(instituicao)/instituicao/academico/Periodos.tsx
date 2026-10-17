'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnoLetivo, PeriodoAvaliativo } from '@notaa/contracts';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, EmptyState, Notice, Skeleton, Table, TextField } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { toast } from '../../../components/toast';

function dataBr(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/**
 * Períodos avaliativos do ano letivo selecionado. A quantidade precisa bater
 * com o regime da regra avaliativa para que a regra possa ser ativada.
 */
export function Periodos({ anoLetivo }: { anoLetivo: AnoLetivo }) {
  const [periodos, setPeriodos] = useState<PeriodoAvaliativo[] | null>(null);
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Período aguardando confirmação de remoção; null com o diálogo fechado.
  const [removendo, setRemovendo] = useState<PeriodoAvaliativo | null>(null);
  const [removendoAgora, setRemovendoAgora] = useState(false);
  const somenteLeitura = anoLetivo.arquivado;

  const carregar = useCallback(async () => {
    try {
      setPeriodos(await apiFetch<PeriodoAvaliativo[]>(`/academico/periodos?anoLetivoId=${anoLetivo.id}`));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os períodos.');
      setPeriodos([]);
    }
  }, [anoLetivo.id]);

  useEffect(() => {
    setPeriodos(null);
    void carregar();
  }, [carregar]);

  const proximaOrdem = (periodos?.reduce((m, p) => Math.max(m, p.ordem), 0) ?? 0) + 1;

  async function criar() {
    setErro(null);
    setEnviando(true);
    try {
      await apiFetch<PeriodoAvaliativo>('/academico/periodos', {
        method: 'POST',
        body: JSON.stringify({ anoLetivoId: anoLetivo.id, ordem: proximaOrdem, nome: nome.trim(), dataInicio, dataFim }),
      });
      setNome('');
      setDataInicio('');
      setDataFim('');
      toast('Período adicionado.', { variant: 'success' });
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível adicionar o período.');
    } finally {
      setEnviando(false);
    }
  }

  async function remover(p: PeriodoAvaliativo) {
    setRemovendoAgora(true);
    try {
      await apiFetch<void>(`/academico/periodos/${p.id}`, { method: 'DELETE' });
      toast('Período removido.', { variant: 'success' });
      await carregar();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Não foi possível remover o período.', { variant: 'error' });
    } finally {
      setRemovendoAgora(false);
      setRemovendo(null);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-3">
        <h2 className="font-display text-[19px] font-semibold leading-[26px] text-ink">Períodos de {anoLetivo.rotulo}</h2>
        {periodos === null ? (
          <Skeleton className="h-40 w-full" />
        ) : periodos.length === 0 ? (
          <EmptyState title="Nenhum período cadastrado">
            Adicione os bimestres, trimestres ou semestres do ano ao lado.
          </EmptyState>
        ) : (
          <Table caption={`Períodos avaliativos de ${anoLetivo.rotulo}`} captionOculta>
            <thead>
              <tr>
                <th scope="col">Ordem</th>
                <th scope="col">Nome</th>
                <th scope="col">Início</th>
                <th scope="col">Fim</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((p) => (
                <tr key={p.id}>
                  <td>{p.ordem}º</td>
                  <td className="font-medium text-ink">{p.nome}</td>
                  <td>{dataBr(p.dataInicio)}</td>
                  <td>{dataBr(p.dataFim)}</td>
                  <td className="text-right">
                    {somenteLeitura ? null : (
                      <Button variant="danger" onClick={() => setRemovendo(p)} aria-label={`Remover ${p.nome}`}>
                        Remover
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar período</CardTitle>
          <CardDescription>
            {somenteLeitura ? 'Este ano letivo está arquivado.' : `Entra como ${proximaOrdem}º período.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void criar();
            }}
          >
            <fieldset disabled={somenteLeitura || enviando} className="space-y-4">
              <TextField label="Nome" id="periodo-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={`${proximaOrdem}º bimestre`} required minLength={2} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Início" id="periodo-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
                <TextField label="Fim" id="periodo-fim" type="date" value={dataFim} min={dataInicio || undefined} onChange={(e) => setDataFim(e.target.value)} required />
              </div>
              {erro ? (
                <Notice tone="danger">{erro}</Notice>
              ) : null}
              <Button type="submit" className="w-full">
                {enviando ? 'Salvando…' : 'Adicionar período'}
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
      <Dialog
        open={removendo !== null}
        onClose={() => (removendoAgora ? undefined : setRemovendo(null))}
        title="Remover período"
        description={`Remover o período “${removendo?.nome ?? ''}”? Esta ação não pode ser desfeita.`}
        closeOnScrim={!removendoAgora}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemovendo(null)} disabled={removendoAgora}>
              Cancelar
            </Button>
            <Button variant="danger" loading={removendoAgora} onClick={() => removendo && void remover(removendo)}>
              Remover período
            </Button>
          </>
        }
      />
    </div>
  );
}
