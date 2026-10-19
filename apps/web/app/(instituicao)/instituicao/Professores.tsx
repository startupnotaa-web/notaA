'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ConviteProfessor, ProfessorDaInstituicao } from '@notaa/contracts';
import { Button, Carregando, Chip, EmptyState, Inset, Notice, Panel, Section, SkeletonLinhas, TextField } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

function linkDoConvite(token: string): string {
  // Montado no cliente porque o token só faz sentido junto do domínio em que a
  // pessoa vai abrir. A entrega é por link, decisão registrada em perfis-decisoes.md.
  const origem = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origem}/convite-professor/${token}`;
}

export function Professores() {
  const [quadro, setQuadro] = useState<ProfessorDaInstituicao[] | null>(null);
  const [convites, setConvites] = useState<ConviteProfessor[]>([]);
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [lista, abertos] = await Promise.all([
        apiFetch<ProfessorDaInstituicao[]>('/instituicao/professores'),
        apiFetch<ConviteProfessor[]>('/instituicao/professores/convites'),
      ]);
      setQuadro(lista);
      setConvites(abertos);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar o quadro.');
      setQuadro([]);
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

  async function copiar(token: string) {
    try {
      await navigator.clipboard.writeText(linkDoConvite(token));
      setCopiado(token);
    } catch {
      // Área de transferência bloqueada: o link fica visível na tela para a
      // pessoa copiar à mão, então não há o que tratar além de não travar.
    }
  }

  return (
    <div className="flex flex-col gap-space-6 md:gap-space-7">
      <Panel title="Convidar professor" description="Geramos um link. Você o entrega ao professor, que cria a conta por ali.">
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            void mutar(async () => {
              await apiFetch<ConviteProfessor>('/instituicao/professores/convites', {
                method: 'POST',
                body: JSON.stringify(email.trim() ? { email: email.trim() } : {}),
              });
              setEmail('');
            }, 'Não foi possível gerar o convite.');
          }}
          className="flex max-w-xl flex-col gap-space-5"
        >
          <TextField
            label="E-mail do professor"
            id="email-convite"
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="E-mail (opcional)"
            hint="O e-mail é só registro de quem foi convidado."
          />
          <div>
            <Button type="submit" loading={enviando}>
              Gerar link de convite
            </Button>
          </div>
        </form>
      </Panel>

      {erro && <Notice tone="danger">{erro}</Notice>}

      {convites.length > 0 && (
        <Section title="Convites abertos">
          <ul className="m-0 flex list-none flex-col p-0">
            {convites.map((c) => (
              <li key={c.id} className="flex flex-col gap-space-3 border-b border-line py-space-4 first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-space-2">
                  <p className="m-0 text-body text-ink">{c.email ?? 'Sem e-mail informado'}</p>
                  <Chip tone="neutral">Expira em {new Date(c.expiraEm).toLocaleDateString('pt-BR')}</Chip>
                </div>
                <Inset className="break-all font-mono text-caption text-ink-muted">{linkDoConvite(c.token)}</Inset>
                <div className="flex flex-wrap gap-space-3">
                  <Button variant="secondary" onClick={() => void copiar(c.token)}>
                    {copiado === c.token ? 'Copiado' : 'Copiar link'}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={enviando}
                    onClick={() =>
                      void mutar(
                        () =>
                          apiFetch(`/instituicao/professores/convites/${c.id}`, {
                            method: 'DELETE',
                          }),
                        'Não foi possível revogar.',
                      )
                    }
                  >
                    Revogar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Quadro de professores" divided>
        {quadro === null ? (
          <Carregando rotulo="Carregando o quadro de professores">
            <SkeletonLinhas linhas={3} />
          </Carregando>
        ) : quadro.length === 0 ? (
          <EmptyState title="Nenhum professor ainda">Gere um link de convite acima e entregue ao professor.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {quadro.map((p) => {
              const bloqueado = p.turmasQueFicariamSemProfessor.length > 0;
              return (
                <li
                  key={p.professorId}
                  className="flex flex-wrap items-start justify-between gap-space-4 border-b border-line py-space-4 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-col gap-space-1">
                    <p className="m-0 text-body font-bold text-ink">{p.nome ?? 'Sem nome'}</p>
                    <p className="m-0 text-body-sm text-ink-muted">{p.email}</p>
                    <p className="m-0 text-caption text-ink-muted">
                      {p.quantidadeDeTurmas} {p.quantidadeDeTurmas === 1 ? 'turma' : 'turmas'}
                    </p>
                    {bloqueado && (
                      <p className="m-0 max-w-texto text-caption text-ink-muted">
                        Único professor de: {p.turmasQueFicariamSemProfessor.map((t) => t.nome).join(', ')}. Vincule outro
                        professor a essas turmas, ou arquive-as, antes de remover.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="danger"
                    disabled={enviando || bloqueado}
                    onClick={() =>
                      void mutar(
                        () =>
                          apiFetch(`/instituicao/professores/${p.professorId}`, {
                            method: 'DELETE',
                          }),
                        'Não foi possível remover.',
                      )
                    }
                  >
                    Remover
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="m-0 text-caption text-ink-muted">
          Remover tira o vínculo com a instituição. A conta do professor continua sendo dele.
        </p>
      </Section>
    </div>
  );
}
