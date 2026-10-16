'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnoLetivo, PeriodoAvaliativo } from '@notaa/contracts';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton, Table } from '@notaa/ui';
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
    if (!window.confirm(`Remover o período “${p.nome}”?`)) return;
    try {
      await apiFetch<void>(`/academico/periodos/${p.id}`, { method: 'DELETE' });
      toast('Período removido.', { variant: 'success' });
      await carregar();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Não foi possível remover o período.', { variant: 'error' });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-text">Períodos de {anoLetivo.rotulo}</h2>
        {periodos === null ? (
          <Skeleton className="h-40 w-full" />
        ) : periodos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">
            Nenhum período cadastrado. Adicione os bimestres, trimestres ou semestres do ano ao lado.
          </p>
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
                  <td className="font-medium text-text">{p.nome}</td>
                  <td>{dataBr(p.dataInicio)}</td>
                  <td>{dataBr(p.dataFim)}</td>
                  <td className="text-right">
                    {somenteLeitura ? null : (
                      <Button variant="ghost" size="sm" onClick={() => void remover(p)} aria-label={`Remover ${p.nome}`}>
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
              <div className="space-y-1">
                <Label htmlFor="periodo-nome">Nome</Label>
                <Input
                  id="periodo-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={`${proximaOrdem}º bimestre`}
                  required
                  minLength={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="periodo-inicio">Início</Label>
                  <Input id="periodo-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="periodo-fim">Fim</Label>
                  <Input
                    id="periodo-fim"
                    type="date"
                    value={dataFim}
                    min={dataInicio || undefined}
                    onChange={(e) => setDataFim(e.target.value)}
                    required
                  />
                </div>
              </div>
              {erro ? (
                <p role="alert" className="text-sm text-error">
                  {erro}
                </p>
              ) : null}
              <Button type="submit" fullWidth>
                {enviando ? 'Salvando…' : 'Adicionar período'}
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
