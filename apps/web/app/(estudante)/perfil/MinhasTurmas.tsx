'use client';

import { useEffect, useState } from 'react';
import type { MinhaTurma, PreviaConvite } from '@notaa/contracts';
import { Button, Chip, Inset, Notice, Panel, Section, Skeleton, TextField } from '@notaa/ui';
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

const ROTULO_STATUS: Record<MinhaTurma['status'], { texto: string; tom: 'brand' | 'neutral' }> =
  {
    ativa: { texto: 'Ativa', tom: 'brand' },
    pendente: { texto: 'Aguardando aprovação', tom: 'neutral' },
    recusada: { texto: 'Recusada', tom: 'neutral' },
    removida: { texto: 'Removida', tom: 'neutral' },
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
    <Section title="Minhas turmas" divided>
      {turmas === null ? (
        <Skeleton className="h-24 w-full" />
      ) : turmas.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {turmas.map((t) => {
            const rotulo = ROTULO_STATUS[t.status];
            return (
              <li key={t.turmaId} className="flex flex-col gap-space-2 border-b border-line py-space-4 first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-space-3">
                  <div className="flex flex-col gap-space-1">
                    <p className="m-0 text-body font-bold text-ink">{t.turmaNome}</p>
                    <p className="m-0 text-body-sm text-ink-muted">
                      {nomeDoDono(t)} · {t.anoLetivoRotulo}
                    </p>
                  </div>
                  <Chip tone={rotulo.tom}>{rotulo.texto}</Chip>
                </div>
                {t.status === 'pendente' && (
                  <p className="m-0 text-caption text-ink-muted">Enquanto não for aprovada, a turma não vê nenhum dado seu.</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 max-w-texto text-body text-ink-muted">
          Você ainda não está em nenhuma turma. Isso é opcional: a plataforma funciona igual sem turma.
        </p>
      )}

      <Panel>
        {etapa.fase === 'codigo' && (
          <form onSubmit={buscarPrevia} className="flex flex-col gap-space-5">
            <TextField
              label="Entrar em uma turma"
              value={codigo}
              onChange={(ev) => setCodigo(ev.target.value)}
              placeholder="Código de convite"
              hint="Peça o código ao seu professor ou à sua instituição."
              autoComplete="off"
              spellCheck={false}
              className="[&_input]:uppercase"
              required
            />
            <div>
              <Button type="submit" loading={carregando} disabled={codigo.trim().length < 4}>
                {carregando ? 'Verificando' : 'Verificar código'}
              </Button>
            </div>
          </form>
        )}

        {etapa.fase === 'confirmar' && (
          <div className="flex flex-col gap-space-5">
            <div className="flex flex-col gap-space-1">
              <p className="m-0 text-label text-primary">Confirme antes de entrar</p>
              <p className="m-0 font-display text-heading-2 text-ink">{etapa.previa.turmaNome}</p>
              <p className="m-0 text-body-sm text-ink-muted">
                {nomeDoDono(etapa.previa)} · Ano letivo {etapa.previa.anoLetivoRotulo}
              </p>
            </div>

            <Inset className="flex flex-col gap-space-2">
              <p className="m-0 text-body-sm text-ink">
                Ao entrar, você autoriza {nomeDoDono(etapa.previa)} a acompanhar seu rendimento e seu histórico de estudos.
              </p>
              <p className="m-0 text-caption text-ink-muted">
                Só o que você produzir depois da aprovação fica visível. Suas conversas com o tutor não são compartilhadas.
              </p>
            </Inset>

            <div className="flex flex-wrap gap-space-3">
              <Button variant="primary" onClick={confirmarEntrada} loading={carregando}>
                {carregando ? 'Enviando' : 'Autorizo e quero entrar'}
              </Button>
              <Button variant="secondary" onClick={recomecar} disabled={carregando}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {etapa.fase === 'enviado' && (
          <div className="flex flex-col gap-space-4">
            <Notice tone="success" title="Solicitação enviada">
              Um professor de {etapa.turma.turmaNome} precisa aprovar sua entrada. Até lá, a turma não vê nenhum dado seu.
            </Notice>
            <div>
              <Button variant="secondary" onClick={recomecar}>
                Entrar em outra turma
              </Button>
            </div>
          </div>
        )}

        {erro && (
          <div className="mt-space-4">
            <Notice tone="danger">{erro}</Notice>
          </div>
        )}
      </Panel>
    </Section>
  );
}
