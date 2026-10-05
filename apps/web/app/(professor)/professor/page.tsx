'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AlunoDaTurma, IndicadorDeTurma, SolicitacaoPendente } from '@notaa/contracts';
import { Badge, Button, Card, CardHeader, Skeleton, cn } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useUser } from '../../../lib/user-context';
import { GestaoDeAnosLetivos } from '../../components/painel/GestaoDeAnosLetivos';
import { GestaoDeTurmas } from '../../components/painel/GestaoDeTurmas';
import { RiskBadge } from './components/RiskBadge';
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
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div
        role="tablist"
        aria-label="Seções do painel"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              aba === a.id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'turmas' && <TurmasQueLeciono ehIndependente />}
      {/* Professor independente não administra quadro de professores: ele já é o
          professor das turmas dele, e a API recusaria esses controles. */}
      {aba === 'gestao' && <GestaoDeTurmas podeGerenciarProfessores={false} />}
      {aba === 'anos' && <GestaoDeAnosLetivos />}
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
    <div className={cn('space-y-6', !ehIndependente && 'mx-auto w-full max-w-5xl px-4 py-6')}>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-text">Suas turmas</h1>
        <p className="text-sm text-text-muted">
          Você vê apenas as turmas em que leciona, e apenas o que cada aluno gerou depois de entrar
          nelas.
        </p>
      </header>

      {erro && (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}

      {turmas === null ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : turmas.length === 0 ? (
        <Card>
          <CardHeader>
            <p className="text-sm text-text-muted">
              {ehIndependente
                ? 'Você ainda não tem turmas. Crie a primeira na aba "Gerenciar turmas" — antes disso, é preciso ter um ano letivo.'
                : 'Você ainda não está vinculado a nenhuma turma. A instituição é que cria as turmas e vincula você a elas.'}
            </p>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Alertas turmas={turmas} />
          <ul className="grid gap-4 sm:grid-cols-2">
            {turmas.map((t) => (
              <li key={t.turmaId}>
                <Card>
                  <CardHeader>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-text">{t.nome}</p>
                        <Badge variant="neutral">{t.anoLetivoRotulo}</Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-text-muted">Alunos</dt>
                          <dd className="font-semibold text-text">{t.alunosAtivos}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">Média XP</dt>
                          <dd className="font-semibold text-text">
                            {t.mediaXp.toLocaleString('pt-BR')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">Sem acesso (7d)</dt>
                          <dd className="font-semibold text-text">{t.alunosSemAcesso7d}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">Pendentes</dt>
                          <dd className="font-semibold text-text">{t.solicitacoesPendentes}</dd>
                        </div>
                      </dl>
                      {t.areaMaisFragil && (
                        <p className="text-xs text-text-muted">
                          Área mais frágil:{' '}
                          {ROTULO_AREA[t.areaMaisFragil.area] ?? t.areaMaisFragil.area} ·{' '}
                          {porcentagem(t.areaMaisFragil.mediaAcertos)} de acerto
                        </p>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setTurmaAberta(t)}>
                        Abrir turma
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
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
    <Card className="border-brand-primary/20 bg-brand-primary/5">
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
          Precisa de você
        </p>
        <ul className="mt-2 space-y-1 text-sm text-text">
          {pendentes.map((t) => (
            <li key={`p-${t.turmaId}`}>
              {t.solicitacoesPendentes} aluno(s) aguardando aprovação em {t.nome}.
            </li>
          ))}
          {semAcesso.map((t) => (
            <li key={`s-${t.turmaId}`}>
              {t.alunosSemAcesso7d} aluno(s) de {t.nome} sem acesso há 7 dias.
            </li>
          ))}
        </ul>
      </CardHeader>
    </Card>
  );
}

/** Nível 2: a turma por dentro. */
function VisaoDaTurma({
  turma,
  onVoltar,
}: {
  turma: IndicadorDeTurma;
  onVoltar: () => void;
}) {
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
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <VisaoDoAluno
          turmaId={turma.turmaId}
          estudanteId={alunoAberto}
          onVoltar={() => setAlunoAberto(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text">{turma.nome}</h1>
          <p className="text-sm text-text-muted">Ano letivo {turma.anoLetivoRotulo}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onVoltar}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { rotulo: 'Alunos', valor: String(turma.alunosAtivos) },
          { rotulo: 'Média XP', valor: turma.mediaXp.toLocaleString('pt-BR') },
          { rotulo: 'Sem acesso (7d)', valor: String(turma.alunosSemAcesso7d) },
          { rotulo: 'Pendentes', valor: String(turma.solicitacoesPendentes) },
        ].map((i) => (
          <Card key={i.rotulo}>
            <CardHeader>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                {i.rotulo}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-text">{i.valor}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      {erro && (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text">Entradas pendentes</h2>
        {pendentes === null ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : pendentes.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhuma solicitação aguardando.</p>
        ) : (
          <Card>
            <CardHeader>
              <ul className="space-y-1">
                {pendentes.map((s) => (
                  <li key={s.estudanteId}>
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
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
                      <span className="text-xs text-text-muted">
                        {new Date(s.solicitadoEm).toLocaleDateString('pt-BR')}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-text-muted">
                A partir da aprovação você passa a ver o rendimento do aluno. Nada anterior a ela fica
                visível.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={enviando || selecionados.length === 0}
                  onClick={() => void decidir('aprovar')}
                >
                  Aprovar {selecionados.length > 0 && `(${selecionados.length})`}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={enviando || selecionados.length === 0}
                  onClick={() => void decidir('recusar')}
                >
                  Recusar
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text">Seus alunos</h2>
        {alunos === null ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : alunos.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nenhum aluno aprovado ainda. Alunos aparecem depois de entrarem com o código e você
            aprovar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-3 py-2 font-semibold">Aluno</th>
                  <th className="px-3 py-2 font-semibold">Situação</th>
                  <th className="px-3 py-2 font-semibold">Último acesso</th>
                  <th className="px-3 py-2 font-semibold">Ofensiva</th>
                  <th className="px-3 py-2 font-semibold">XP</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {alunos.map((a) => (
                  <tr key={a.estudanteId} className="border-b border-border/50">
                    <td className="px-3 py-2 font-semibold text-text">{a.nome ?? 'Sem nome'}</td>
                    <td className="px-3 py-2">
                      <RiskBadge risco={a.risco} />
                    </td>
                    <td className="px-3 py-2 text-text-muted">
                      {a.ultimoAcessoEm
                        ? new Date(a.ultimoAcessoEm).toLocaleDateString('pt-BR')
                        : 'Nunca'}
                    </td>
                    <td className="px-3 py-2 text-text">{a.streak}</td>
                    <td className="px-3 py-2 text-text">{a.xpTotal.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAlunoAberto(a.estudanteId)}
                      >
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-text-muted">
          A situação considera engajamento, não nota. Cada aluno aparece a partir da data em que a
          entrada dele nesta turma foi aprovada.
        </p>
      </section>
    </div>
  );
}
