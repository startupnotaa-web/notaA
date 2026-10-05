'use client';

import { useEffect, useState } from 'react';
import type { MinhaTurma, PreviaConvite } from '@notaa/contracts';
import { Badge, Button, Card, CardHeader, Input, Label, SectionHeader, Skeleton } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

/**
 * Seção "Entrar em uma turma" do perfil do aluno (perfis.md).
 *
 * Entrar em turma é OPCIONAL: o aluno usa a plataforma inteira sem nenhuma, e
 * esta seção nunca bloqueia nada. Por isso ela é um bloco a mais no perfil, e
 * não um passo do cadastro.
 *
 * O fluxo tem duas etapas de propósito. Primeiro o aluno digita o código e vê a
 * confirmação com o nome da turma e de quem ela é; só depois ele consente e
 * envia. perfis.md pede essa conferência, e ela também evita que um código
 * digitado errado vire solicitação numa turma desconhecida.
 */

type Etapa =
  | { fase: 'codigo' }
  | { fase: 'confirmar'; previa: PreviaConvite }
  | { fase: 'enviado'; turma: MinhaTurma };

const ROTULO_STATUS: Record<MinhaTurma['status'], { texto: string; variante: 'brand' | 'neutral' }> =
  {
    ativa: { texto: 'Ativa', variante: 'brand' },
    pendente: { texto: 'Aguardando aprovação', variante: 'neutral' },
    recusada: { texto: 'Recusada', variante: 'neutral' },
    removida: { texto: 'Removida', variante: 'neutral' },
  };

function nomeDoDono(turma: Pick<MinhaTurma, 'dono'>): string {
  return turma.dono.tipo === 'instituicao'
    ? turma.dono.nome
    : `Prof. ${turma.dono.nome}`;
}

export function MinhasTurmas() {
  const [turmas, setTurmas] = useState<MinhaTurma[] | null>(null);
  const [etapa, setEtapa] = useState<Etapa>({ fase: 'codigo' });
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function carregarTurmas() {
    try {
      setTurmas(await apiFetch<MinhaTurma[]>('/me/turmas'));
    } catch (e) {
      console.error('Falha ao carregar turmas do aluno:', e);
      // Lista vazia em vez de erro na tela: a seção é opcional e não deve
      // atrapalhar o resto do perfil se a API estiver instável.
      setTurmas([]);
    }
  }

  useEffect(() => {
    void carregarTurmas();
  }, []);

  async function buscarPrevia(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const previa = await apiFetch<PreviaConvite>(
        `/me/turmas/convite/${encodeURIComponent(codigo.trim())}`,
      );
      setEtapa({ fase: 'confirmar', previa });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível verificar este código.');
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarEntrada() {
    setErro(null);
    setCarregando(true);
    try {
      const turma = await apiFetch<MinhaTurma>('/me/turmas/convite', {
        method: 'POST',
        // `consentimento: true` é exigido pelo contrato. O botão abaixo é o ato
        // de consentir, e o texto ao lado dele diz exatamente com o quê.
        body: JSON.stringify({ codigo: codigo.trim(), consentimento: true }),
      });
      setEtapa({ fase: 'enviado', turma });
      setCodigo('');
      await carregarTurmas();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar a solicitação.');
    } finally {
      setCarregando(false);
    }
  }

  function recomecar() {
    setEtapa({ fase: 'codigo' });
    setErro(null);
  }

  return (
    <section className="space-y-4">
      <SectionHeader title="Minhas" accent="Turmas" as="h2" />

      {turmas === null ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : turmas.length > 0 ? (
        <ul className="space-y-2">
          {turmas.map((t) => {
            const rotulo = ROTULO_STATUS[t.status];
            return (
              <li key={t.turmaId}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-bold text-text">{t.turmaNome}</p>
                        <p className="text-sm text-text-muted">
                          {nomeDoDono(t)} · {t.anoLetivoRotulo}
                        </p>
                      </div>
                      <Badge variant={rotulo.variante}>{rotulo.texto}</Badge>
                    </div>
                    {t.status === 'pendente' && (
                      <p className="mt-3 text-xs text-text-muted">
                        Enquanto não for aprovada, a turma não vê nenhum dado seu.
                      </p>
                    )}
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">
          Você ainda não está em nenhuma turma. Isso é opcional: a plataforma funciona igual sem
          turma.
        </p>
      )}

      <Card>
        <CardHeader>
          {etapa.fase === 'codigo' && (
            <form onSubmit={buscarPrevia} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="codigo-turma">Entrar em uma turma</Label>
                <Input
                  id="codigo-turma"
                  value={codigo}
                  onChange={(ev) => setCodigo(ev.target.value)}
                  placeholder="Código de convite"
                  autoComplete="off"
                  spellCheck={false}
                  className="uppercase"
                  required
                />
                <p className="text-xs text-text-muted">
                  Peça o código ao seu professor ou à sua instituição.
                </p>
              </div>
              <Button type="submit" disabled={carregando || codigo.trim().length < 4}>
                {carregando ? 'Verificando…' : 'Verificar código'}
              </Button>
            </form>
          )}

          {etapa.fase === 'confirmar' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                  Confirme antes de entrar
                </p>
                <p className="text-xl font-extrabold text-text">{etapa.previa.turmaNome}</p>
                <p className="text-sm text-text-muted">
                  {nomeDoDono(etapa.previa)} · Ano letivo {etapa.previa.anoLetivoRotulo}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-sm text-text">
                  Ao entrar, você autoriza {nomeDoDono(etapa.previa)} a acompanhar seu rendimento e
                  seu histórico de estudos.
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  Só o que você produzir depois da aprovação fica visível. Suas conversas com o tutor
                  não são compartilhadas.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="cta" onClick={confirmarEntrada} disabled={carregando}>
                  {carregando ? 'Enviando…' : 'Autorizo e quero entrar'}
                </Button>
                <Button variant="secondary" onClick={recomecar} disabled={carregando}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {etapa.fase === 'enviado' && (
            <div className="space-y-3">
              <p className="font-bold text-text">Solicitação enviada</p>
              <p className="text-sm text-text-muted">
                Um professor de {etapa.turma.turmaNome} precisa aprovar sua entrada. Até lá, a turma
                não vê nenhum dado seu.
              </p>
              <Button variant="secondary" onClick={recomecar}>
                Entrar em outra turma
              </Button>
            </div>
          )}

          {erro && (
            <p role="alert" className="mt-3 text-sm text-error">
              {erro}
            </p>
          )}
        </CardHeader>
      </Card>
    </section>
  );
}
