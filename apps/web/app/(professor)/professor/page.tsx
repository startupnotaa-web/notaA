'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AlunoDaTurma, IndicadorDeTurma, SolicitacaoPendente } from '@notaa/contracts';
import {
  ActionRow,
  Button,
  Carregando,
  Chip,
  EmptyState,
  Notice,
  PageHeader,
  Section,
  Skeleton,
  SkeletonLinhas,
  SummaryStrip,
  Table,
  Tabs,
  propsDoPainel,
} from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useUser } from '../../../lib/user-context';
import { GestaoDeAnosLetivos } from '../../components/painel/GestaoDeAnosLetivos';
import { GestaoDeTurmas } from '../../components/painel/GestaoDeTurmas';
import { SituacaoDoAluno } from './components/SituacaoDoAluno';
import { VisaoDoAluno } from './components/VisaoDoAluno';

/**
 * Painel do professor (perfis.md).
 *
 * Nível 1 — visão geral: resumo das turmas em que ele leciona e alertas
 * acionáveis (alunos sem acesso, entradas pendentes).
 * Nível 2 — visão da turma: indicadores daquela turma, fila de aprovação e a
 * lista de alunos com os indicadores principais.
 * Nível 3 — visão do aluno: desempenho por área, temas em que erra, evolução no
 * tempo e redações com nota por competência e texto.
 *
 * Serve os dois papéis que lecionam, mas eles NÃO têm o mesmo painel.
 *
 * O institucional só acompanha: a instituição é que cria as turmas e o vincula a
 * elas. O independente é DONO das turmas dele, então perfis.md lhe dá também
 * criar turma, gerenciar código de convite, remover aluno e gerenciar ano letivo
 * — e esses controles aparecem em abas próprias, reusando os mesmos componentes
 * do painel da instituição.
 *
 * O escopo de leitura é igual para os dois: só as turmas em que a pessoa está
 * vinculada, decidido no servidor.
 */

const ROTULO_AREA: Record<string, string> = {
  linguagens: 'Linguagens',
  humanas: 'Ciências Humanas',
  natureza: 'Ciências da Natureza',
  matematica: 'Matemática',
  redacao: 'Redação',
};

function porcentagem(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

/**
 * Painel do professor. Para o independente, abas; para o institucional, só a
 * visão de acompanhamento, porque ele não administra nada.
 */
export default function ProfessorPainelPage() {
  const { role, loading } = useUser();
  const [aba, setAba] = useState<'turmas' | 'gestao' | 'anos'>('turmas');

  if (loading) {
    return (
      <Carregando rotulo="Carregando o painel">
        <Skeleton className="h-40 w-full" />
      </Carregando>
    );
  }

  const ehIndependente = role === 'professor_independente';

  if (!ehIndependente) {
    return <TurmasQueLeciono ehIndependente={false} />;
  }

  const ABAS = [
    { id: 'turmas' as const, rotulo: 'Acompanhamento' },
    { id: 'gestao' as const, rotulo: 'Gerenciar turmas' },
    { id: 'anos' as const, rotulo: 'Ano letivo' },
  ];

  return (
    <div className="flex flex-col gap-space-6">
      <Tabs
        label="Seções do painel"
        idBase="professor"
        tabs={ABAS.map((a) => ({ id: a.id, label: a.rotulo }))}
        value={aba}
        onChange={(id) => setAba(id as typeof aba)}
      />

      <div {...propsDoPainel('professor', aba)} className="flex flex-col gap-space-6">
        {aba === 'turmas' && <TurmasQueLeciono ehIndependente />}
        {/* Professor independente não administra quadro de professores: ele já é o
          professor das turmas dele, e a API recusaria esses controles. */}
        {aba === 'gestao' && <GestaoDeTurmas podeGerenciarProfessores={false} />}
        {aba === 'anos' && <GestaoDeAnosLetivos />}
      </div>
    </div>
  );
}

function TurmasQueLeciono({ ehIndependente }: { ehIndependente: boolean }) {
  const [turmas, setTurmas] = useState<IndicadorDeTurma[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [turmaAberta, setTurmaAberta] = useState<IndicadorDeTurma | null>(null);

  const carregar = useCallback(async () => {
    try {
      setTurmas(await apiFetch<IndicadorDeTurma[]>('/class/turmas'));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar suas turmas.');
      setTurmas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (turmaAberta) {
    return (
      <VisaoDaTurma
        turma={turmaAberta}
        onVoltar={() => {
          setTurmaAberta(null);
          void carregar();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-space-6 md:gap-space-7">
      <PageHeader
        title="Suas turmas"
        description="Você vê apenas as turmas em que leciona, e apenas o que cada aluno gerou depois de entrar nelas."
      />

      {erro && <Notice tone="danger">{erro}</Notice>}

      {turmas === null ? (
        <Carregando rotulo="Carregando as suas turmas">
          <SkeletonLinhas linhas={3} />
        </Carregando>
      ) : turmas.length === 0 ? (
        <EmptyState title="Nenhuma turma por aqui">
          {ehIndependente
            ? 'Crie a primeira na aba "Gerenciar turmas". Antes disso, é preciso ter um ano letivo.'
            : 'A instituição é que cria as turmas e vincula você a elas.'}
        </EmptyState>
      ) : (
        <>
          <Alertas turmas={turmas} />
          <Section title="Turmas em que você leciona">
            <ul className="m-0 flex list-none flex-col p-0">
              {turmas.map((t) => (
                <li
                  key={t.turmaId}
                  className="flex flex-col gap-space-4 border-b border-line py-space-5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-space-3">
                    <div className="flex items-center gap-space-3">
                      <p className="m-0 font-display text-heading-3 text-ink">{t.nome}</p>
                      <Chip tone="neutral">{t.anoLetivoRotulo}</Chip>
                    </div>
                    <Button variant="secondary" onClick={() => setTurmaAberta(t)}>
                      Abrir turma
                      <span className="sr-only"> {t.nome}</span>
                    </Button>
                  </div>
                  <SummaryStrip
                    aria-label={`Indicadores de ${t.nome}`}
                    items={[
                      { id: 'alunos', label: 'Alunos', value: String(t.alunosAtivos) },
                      { id: 'xp', label: 'Média XP', value: t.mediaXp.toLocaleString('pt-BR') },
                      { id: 'sem', label: 'Sem acesso (7d)', value: String(t.alunosSemAcesso7d) },
                      { id: 'pend', label: 'Pendentes', value: String(t.solicitacoesPendentes) },
                    ]}
                  />
                  {t.areaMaisFragil && (
                    <p className="m-0 text-caption text-ink-muted">
                      Área mais frágil:{' '}
                      {ROTULO_AREA[t.areaMaisFragil.area] ?? t.areaMaisFragil.area} ·{' '}
                      {porcentagem(t.areaMaisFragil.mediaAcertos)} de acerto
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}

/** Alertas acionáveis, não números soltos: cada linha diz o que fazer. */
function Alertas({ turmas }: { turmas: readonly IndicadorDeTurma[] }) {
  const pendentes = turmas.filter((t) => t.solicitacoesPendentes > 0);
  const semAcesso = turmas.filter((t) => t.alunosSemAcesso7d > 0);

  if (pendentes.length === 0 && semAcesso.length === 0) return null;

  return (
    <Section title="Precisa de você">
      <ul className="m-0 flex list-none flex-col p-0">
        {pendentes.map((t) => (
          <ActionRow
            key={`p-${t.turmaId}`}
            status={<Chip tone="brand">Pendente</Chip>}
            title={`${t.solicitacoesPendentes} ${t.solicitacoesPendentes === 1 ? 'aluno aguardando' : 'alunos aguardando'} aprovação`}
            description={t.nome}
          />
        ))}
        {semAcesso.map((t) => (
          <ActionRow
            key={`s-${t.turmaId}`}
            status={<Chip tone="warning">Atenção</Chip>}
            title={`${t.alunosSemAcesso7d} ${t.alunosSemAcesso7d === 1 ? 'aluno sem acesso' : 'alunos sem acesso'} há 7 dias`}
            description={t.nome}
          />
        ))}
      </ul>
    </Section>
  );
}

/** Nível 2: a turma por dentro. */
function VisaoDaTurma({ turma, onVoltar }: { turma: IndicadorDeTurma; onVoltar: () => void }) {
  const [alunos, setAlunos] = useState<AlunoDaTurma[] | null>(null);
  const [pendentes, setPendentes] = useState<SolicitacaoPendente[] | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [alunoAberto, setAlunoAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [lista, fila] = await Promise.all([
        // Alunos DESTA turma, com a janela de cada matrícula. Antes a lista vinha
        // de `/class/analytics`, que agrega todas as turmas do professor de uma
        // vez — exibi-la aqui dizia que era da turma aberta, e não era.
        apiFetch<AlunoDaTurma[]>(`/turma/${turma.turmaId}/alunos`),
        apiFetch<SolicitacaoPendente[]>(`/turma/${turma.turmaId}/solicitacoes`),
      ]);
      setAlunos(lista);
      setPendentes(fila);
      setSelecionados(fila.map((s) => s.estudanteId));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar a turma.');
      setAlunos([]);
      setPendentes([]);
    }
  }, [turma.turmaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function decidir(decisao: 'aprovar' | 'recusar') {
    if (selecionados.length === 0) return;
    setErro(null);
    setEnviando(true);
    try {
      await apiFetch(`/turma/${turma.turmaId}/solicitacoes/${decisao}`, {
        method: 'POST',
        body: JSON.stringify({ estudanteIds: selecionados }),
      });
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível concluir.');
    } finally {
      setEnviando(false);
    }
  }

  if (alunoAberto) {
    return (
      <div>
        <VisaoDoAluno
          turmaId={turma.turmaId}
          estudanteId={alunoAberto}
          onVoltar={() => setAlunoAberto(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-6 md:gap-space-7">
      <PageHeader
        title={turma.nome}
        description={`Ano letivo ${turma.anoLetivoRotulo}`}
        actions={
          <Button variant="secondary" onClick={onVoltar}>
            Voltar
          </Button>
        }
      />

      <SummaryStrip
        aria-label="Indicadores da turma"
        items={[
          { id: 'alunos', label: 'Alunos', value: String(turma.alunosAtivos) },
          { id: 'xp', label: 'Média XP', value: turma.mediaXp.toLocaleString('pt-BR') },
          { id: 'sem', label: 'Sem acesso (7d)', value: String(turma.alunosSemAcesso7d) },
          { id: 'pend', label: 'Pendentes', value: String(turma.solicitacoesPendentes) },
        ]}
      />

      {erro && <Notice tone="danger">{erro}</Notice>}

      <Section title="Entradas pendentes">
        {pendentes === null ? (
          <Carregando rotulo="Carregando as solicitações">
            <SkeletonLinhas linhas={2} />
          </Carregando>
        ) : pendentes.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">Nenhuma solicitação aguardando.</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col p-0">
              {pendentes.map((s) => (
                <li key={s.estudanteId}>
                  <label className="flex min-h-[44px] items-center gap-space-3 text-body text-ink">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-primary"
                      checked={selecionados.includes(s.estudanteId)}
                      onChange={(ev) =>
                        setSelecionados((atual) =>
                          ev.target.checked
                            ? [...atual, s.estudanteId]
                            : atual.filter((id) => id !== s.estudanteId),
                        )
                      }
                    />
                    <span>{s.nome ?? 'Sem nome'}</span>
                    <span className="text-caption text-ink-muted">
                      {new Date(s.solicitadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="m-0 max-w-texto text-caption text-ink-muted">
              A partir da aprovação você passa a ver o rendimento do aluno. Nada anterior a ela fica
              visível.
            </p>
            <div className="flex flex-wrap gap-space-3">
              <Button
                disabled={selecionados.length === 0}
                loading={enviando}
                onClick={() => void decidir('aprovar')}
              >
                Aprovar {selecionados.length > 0 && `(${selecionados.length})`}
              </Button>
              <Button
                variant="secondary"
                disabled={enviando || selecionados.length === 0}
                onClick={() => void decidir('recusar')}
              >
                Recusar
              </Button>
            </div>
          </>
        )}
      </Section>

      <Section title="Seus alunos" divided>
        {alunos === null ? (
          <Carregando rotulo="Carregando os alunos">
            <SkeletonLinhas linhas={5} />
          </Carregando>
        ) : alunos.length === 0 ? (
          <EmptyState title="Nenhum aluno aprovado ainda">
            Alunos aparecem depois de entrarem com o código e você aprovar.
          </EmptyState>
        ) : (
          <Table caption="Alunos da turma" captionOculta className="min-w-[38rem]">
            <thead>
              <tr>
                <th scope="col">Aluno</th>
                <th scope="col">Situação</th>
                <th scope="col">Último acesso</th>
                <th scope="col" className="text-right">
                  Ofensiva
                </th>
                <th scope="col" className="text-right">
                  XP
                </th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.estudanteId}>
                  <th scope="row" className="text-left font-bold text-ink">
                    {a.nome ?? 'Sem nome'}
                  </th>
                  <td>
                    <SituacaoDoAluno risco={a.risco} />
                  </td>
                  <td className="text-ink-muted">
                    {a.ultimoAcessoEm
                      ? new Date(a.ultimoAcessoEm).toLocaleDateString('pt-BR')
                      : 'Nunca'}
                  </td>
                  <td className="tabular text-right">{a.streak}</td>
                  <td className="tabular text-right">{a.xpTotal.toLocaleString('pt-BR')}</td>
                  <td className="text-right">
                    <Button variant="quiet" onClick={() => setAlunoAberto(a.estudanteId)}>
                      Abrir<span className="sr-only"> {a.nome ?? 'aluno'}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="m-0 max-w-texto text-caption text-ink-muted">
          A situação considera engajamento, não nota. Cada aluno aparece a partir da data em que a
          entrada dele nesta turma foi aprovada.
        </p>
      </Section>
    </div>
  );
}
