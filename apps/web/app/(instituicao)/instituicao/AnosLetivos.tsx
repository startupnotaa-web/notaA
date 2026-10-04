'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnoLetivo } from '@notaa/contracts';
import { Badge, Button, Card, CardHeader, Input, Label, Skeleton } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

/**
 * Ano letivo. O rótulo é global da plataforma; as datas são desta instituição.
 *
 * Arquivar o ano torna as turmas dele somente leitura. Lembrete importante do
 * perfis.md: na virada do ano os alunos NÃO são migrados — cada um insere o
 * código da turma nova. A tela diz isso para ninguém arquivar esperando outra
 * coisa.
 */
export function AnosLetivos() {
  const [anos, setAnos] = useState<AnoLetivo[] | null>(null);
  const [rotulo, setRotulo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setAnos(await apiFetch<AnoLetivo[]>('/ano-letivo'));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os anos letivos.');
      setAnos([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function mutar(fn: () => Promise<unknown>, mensagemPadrao: string) {
    setErro(null);
    setEnviando(true);
    try {
      await fn();
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : mensagemPadrao);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              void mutar(async () => {
                await apiFetch<AnoLetivo>('/ano-letivo', {
                  method: 'POST',
                  body: JSON.stringify({
                    rotulo: rotulo.trim(),
                    dataInicio: dataInicio || null,
                    dataFim: dataFim || null,
                  }),
                });
                setRotulo('');
                setDataInicio('');
                setDataFim('');
              }, 'Não foi possível criar o ano letivo.');
            }}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="rotulo-ano">Ano letivo</Label>
                <Input
                  id="rotulo-ano"
                  value={rotulo}
                  onChange={(ev) => setRotulo(ev.target.value)}
                  placeholder="2026"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inicio-ano">Início</Label>
                <Input
                  id="inicio-ano"
                  type="date"
                  value={dataInicio}
                  onChange={(ev) => setDataInicio(ev.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fim-ano">Fim</Label>
                <Input
                  id="fim-ano"
                  type="date"
                  value={dataFim}
                  onChange={(ev) => setDataFim(ev.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={enviando || rotulo.trim().length < 2}>
              Criar ano letivo
            </Button>
          </form>
        </CardHeader>
      </Card>

      {erro && (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}

      {anos === null ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : anos.length === 0 ? (
        <p className="text-sm text-text-muted">
          Nenhum ano letivo. Crie um para poder criar turmas.
        </p>
      ) : (
        <ul className="space-y-2">
          {anos.map((a) => (
            <li key={a.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-text">{a.rotulo}</p>
                        {a.arquivado && <Badge variant="neutral">Arquivado</Badge>}
                      </div>
                      <p className="text-sm text-text-muted">
                        {a.dataInicio && a.dataFim
                          ? `${new Date(a.dataInicio).toLocaleDateString('pt-BR')} a ${new Date(a.dataFim).toLocaleDateString('pt-BR')}`
                          : 'Datas não definidas'}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={enviando}
                      onClick={() =>
                        void mutar(
                          () =>
                            apiFetch<AnoLetivo>(`/ano-letivo/${a.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ arquivado: !a.arquivado }),
                            }),
                          'Não foi possível alterar o ano letivo.',
                        )
                      }
                    >
                      {a.arquivado ? 'Reabrir' : 'Arquivar'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-text-muted">
        Ao arquivar um ano, as turmas dele ficam somente leitura com o histórico preservado. Os alunos
        não são migrados: no ano novo, cada um entra com o código da turma nova.
      </p>
    </div>
  );
}
