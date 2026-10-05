'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ConviteProfessor, ProfessorDaInstituicao } from '@notaa/contracts';
import { Badge, Button, Card, CardHeader, Input, Label, Skeleton } from '@notaa/ui';
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
    <div className="space-y-8">
      <Card>
        <CardHeader>
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
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="email-convite">Convidar professor</Label>
              <Input
                id="email-convite"
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="E-mail (opcional)"
              />
              <p className="text-xs text-text-muted">
                Geramos um link. Você o entrega ao professor, que cria a conta por ali. O e-mail é só
                registro de quem foi convidado.
              </p>
            </div>
            <Button type="submit" disabled={enviando}>
              Gerar link de convite
            </Button>
          </form>
        </CardHeader>
      </Card>

      {erro && (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}

      {convites.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text">Convites abertos</h2>
          <ul className="space-y-2">
            {convites.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardHeader>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-text">{c.email ?? 'Sem e-mail informado'}</p>
                        <Badge variant="neutral">
                          Expira em {new Date(c.expiraEm).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>
                      <p className="break-all rounded-lg border border-border bg-surface-2 p-2 font-mono text-xs text-text-muted">
                        {linkDoConvite(c.token)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => void copiar(c.token)}>
                          {copiado === c.token ? 'Copiado' : 'Copiar link'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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
                    </div>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text">Quadro de professores</h2>
        {quadro === null ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : quadro.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nenhum professor ainda. Gere um link de convite acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {quadro.map((p) => {
              const bloqueado = p.turmasQueFicariamSemProfessor.length > 0;
              return (
                <li key={p.professorId}>
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-bold text-text">{p.nome ?? 'Sem nome'}</p>
                          <p className="text-sm text-text-muted">{p.email}</p>
                          <p className="text-xs text-text-muted">
                            {p.quantidadeDeTurmas} turma(s)
                          </p>
                          {bloqueado && (
                            <p className="text-xs text-text-muted">
                              Único professor de:{' '}
                              {p.turmasQueFicariamSemProfessor.map((t) => t.nome).join(', ')}.
                              Vincule outro professor a essas turmas, ou arquive-as, antes de remover.
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
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
                      </div>
                    </CardHeader>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-text-muted">
          Remover tira o vínculo com a instituição. A conta do professor continua sendo dele.
        </p>
      </section>
    </div>
  );
}
