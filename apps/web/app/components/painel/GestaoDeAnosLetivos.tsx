'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnoLetivo } from '@notaa/contracts';
import { Button, Carregando, Chip, EmptyState, Notice, Panel, Section, SkeletonLinhas, TextField } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

/**
 * Ano letivo. O rótulo é global da plataforma; as datas são de quem é DONO das
 * turmas — instituição ou professor independente. As rotas são as mesmas para os
 * dois, por isso este componente serve aos dois painéis sem variação.
 *
 * Arquivar o ano torna as turmas dele somente leitura. Lembrete importante do
 * perfis.md: na virada do ano os alunos NÃO são migrados — cada um insere o
 * código da turma nova. A tela diz isso para ninguém arquivar esperando outra
 * coisa.
 */
export function GestaoDeAnosLetivos() {
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
    <div className="flex flex-col gap-space-6 md:gap-space-7">
      <Panel title="Criar ano letivo">
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
          className="flex flex-col gap-space-5"
        >
          <div className="grid gap-space-5 sm:grid-cols-3">
            <TextField label="Ano letivo" id="rotulo-ano" value={rotulo} onChange={(ev) => setRotulo(ev.target.value)} placeholder="2026" required />
            <TextField label="Início" id="inicio-ano" type="date" value={dataInicio} onChange={(ev) => setDataInicio(ev.target.value)} />
            <TextField label="Fim" id="fim-ano" type="date" value={dataFim} onChange={(ev) => setDataFim(ev.target.value)} />
          </div>
          <div>
            <Button type="submit" loading={enviando} disabled={rotulo.trim().length < 2}>
              Criar ano letivo
            </Button>
          </div>
        </form>
      </Panel>

      {erro && <Notice tone="danger">{erro}</Notice>}

      <Section title="Anos letivos">
        {anos === null ? (
          <Carregando rotulo="Carregando os anos letivos">
            <SkeletonLinhas linhas={2} />
          </Carregando>
        ) : anos.length === 0 ? (
          <EmptyState title="Nenhum ano letivo">Crie um ano letivo acima para poder criar turmas.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {anos.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-space-4 border-b border-line py-space-4 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-col gap-space-1">
                  <div className="flex items-center gap-space-2">
                    <p className="m-0 text-body font-bold text-ink">{a.rotulo}</p>
                    {a.arquivado && <Chip tone="neutral">Arquivado</Chip>}
                  </div>
                  <p className="m-0 text-body-sm text-ink-muted">
                    {a.dataInicio && a.dataFim
                      ? `${new Date(a.dataInicio).toLocaleDateString('pt-BR')} a ${new Date(a.dataFim).toLocaleDateString('pt-BR')}`
                      : 'Datas não definidas'}
                  </p>
                </div>
                <Button
                  variant="secondary"
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
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 max-w-texto text-caption text-ink-muted">
          Ao arquivar um ano, as turmas dele ficam somente leitura com o histórico preservado. Os alunos não são migrados:
          no ano novo, cada um entra com o código da turma nova.
        </p>
      </Section>
    </div>
  );
}
