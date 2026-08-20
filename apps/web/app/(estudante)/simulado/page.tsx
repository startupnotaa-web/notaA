'use client';
// Simulado no formato da prova real (doc 08 E6): bloco fechado de 40 questões,
// 10 por área, sem dizer se acertou. O aluno responde, navega livremente e só
// vê o resultado no relatório final — por isso nenhuma alternativa que chega
// aqui carrega `correta`, e a correção inteira mora no servidor.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  SIMULADO_LIMITES_MINUTOS,
  SIMULADO_QUESTOES_POR_AREA,
  SIMULADO_TOTAL_QUESTOES,
  type ResumeSimuladoResponse,
  type SaveSimuladoAnswerResponse,
  type SimuladoRelatorio,
  type StartSimuladoResponse,
} from '@notaa/contracts';
import { Badge, Button, Card, OptionCard, Progress, Skeleton, cn } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';
import { useUser } from '../../../lib/user-context';
import { toast } from '../../components/toast';
import { RelatorioSimulado } from './RelatorioSimulado';
import { formatarDuracao, rotuloArea } from './labels';

type Fase = 'config' | 'prova' | 'relatorio';

/** Opção escolhida na tela inicial — o modo livre não tem limite. */
type Escolha = { modo: 'cronometrado'; limiteMinutos: 60 | 90 } | { modo: 'livre' };

/** Abaixo disto o cronômetro fica vermelho e pulsa. */
const ALERTA_TEMPO_SEGUNDOS = 5 * 60;

/**
 * Guarda a prova aberta para conseguir retomá-la. Só o id: a prova inteira
 * (inclusive quais alternativas existem) vem do servidor, nunca do navegador.
 */
const CHAVE_SESSAO_ABERTA = 'notaa:simulado:sessao-aberta';

export default function SimuladoPage() {
  const { addXP, refreshPerfil } = useUser();

  const [fase, setFase] = useState<Fase>('config');
  const [sessao, setSessao] = useState<StartSimuladoResponse | null>(null);
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [relatorio, setRelatorio] = useState<SimuladoRelatorio | null>(null);
  const [restante, setRestante] = useState<number | null>(null);
  const [confirmandoFim, setConfirmandoFim] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  /** Enquanto true, ainda não se sabe se há prova aberta — não mostrar a config. */
  const [verificandoRetomada, setVerificandoRetomada] = useState(true);

  /** Respostas cujo POST falhou — reenviadas antes de finalizar. */
  const pendentes = useRef<Map<string, { respostaId: string; tempoRespostaMs: number }>>(new Map());
  /** Quando a questão atual apareceu na tela, para medir o tempo de resposta. */
  const abertaEm = useRef<number>(Date.now());
  /** Guarda contra duplo finish (clique + expiração do cronômetro). */
  const finalizando = useRef(false);

  const questoes = sessao?.questoes ?? [];
  const questao = questoes[indice];
  const respondidas = useMemo(
    () => questoes.filter((q) => respostas[q.itemId] != null).length,
    [questoes, respostas],
  );
  const emBranco = questoes.length - respondidas;

  // ── retomada ─────────────────────────────────────────────────────────────
  // Recarregar a página, cair a internet ou fechar a aba sem querer não pode
  // custar a prova inteira. O prazo continua sendo o do servidor.

  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_SESSAO_ABERTA);
    if (!salvo) {
      setVerificandoRetomada(false);
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const res = await apiFetch<ResumeSimuladoResponse>(`/simulado/sessions/${salvo}`);
        if (cancelado) return;
        if (res.finalizado) {
          localStorage.removeItem(CHAVE_SESSAO_ABERTA);
          return;
        }
        setSessao(res);
        setRespostas(res.respostas);
        // Volta na 1ª questão em branco: é onde o aluno provavelmente parou.
        const primeiraEmBranco = res.questoes.findIndex((q) => res.respostas[q.itemId] == null);
        setIndice(primeiraEmBranco === -1 ? 0 : primeiraEmBranco);
        abertaEm.current = Date.now();
        setFase('prova');
        toast(
          res.expirado
            ? 'O tempo desta prova acabou — finalize para ver o relatório.'
            : 'Você tinha uma prova em andamento. Continuando de onde parou.',
          { variant: 'info' },
        );
      } catch {
        // Sessão de outro aluno, apagada ou id inválido: começa do zero.
        localStorage.removeItem(CHAVE_SESSAO_ABERTA);
      } finally {
        if (!cancelado) setVerificandoRetomada(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // ── início ───────────────────────────────────────────────────────────────

  async function iniciar(escolha: Escolha) {
    setErro(null);
    setCarregando(true);
    try {
      const res = await apiFetch<StartSimuladoResponse>('/simulado/sessions', {
        method: 'POST',
        body: JSON.stringify(escolha),
      });
      pendentes.current.clear();
      finalizando.current = false;
      localStorage.setItem(CHAVE_SESSAO_ABERTA, res.sessaoId);
      setSessao(res);
      setRespostas({});
      setIndice(0);
      setRelatorio(null);
      setConfirmandoFim(false);
      abertaEm.current = Date.now();
      setFase('prova');
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : 'Não foi possível montar seu simulado. Tente de novo em instantes.';
      setErro(msg);
      toast(msg, { variant: 'error' });
    } finally {
      setCarregando(false);
    }
  }

  // ── cronômetro ───────────────────────────────────────────────────────────
  // O prazo é o `expiraEm` do servidor: recarregar a página ou mexer no relógio
  // do computador não compra tempo extra.

  useEffect(() => {
    if (fase !== 'prova' || !sessao?.expiraEm) {
      setRestante(null);
      return;
    }
    const alvo = new Date(sessao.expiraEm).getTime();
    const tick = () => setRestante(Math.max(0, Math.round((alvo - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fase, sessao?.expiraEm]);

  // As respostas já estão no servidor e a prova é retomável, mas o cronômetro
  // não para quando a aba fecha — por isso o aviso continua valendo.
  useEffect(() => {
    if (fase !== 'prova') return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [fase]);

  // ── fim ──────────────────────────────────────────────────────────────────

  const finalizar = useCallback(
    async (automatico = false) => {
      if (!sessao || finalizando.current) return;
      finalizando.current = true;
      setCarregando(true);
      setConfirmandoFim(false);

      // Reenvia o que ficou pendente antes de pedir a correção.
      for (const [itemId, dados] of pendentes.current) {
        try {
          await apiFetch(`/simulado/sessions/${sessao.sessaoId}/answers`, {
            method: 'POST',
            body: JSON.stringify({ itemId, ...dados }),
          });
          pendentes.current.delete(itemId);
        } catch {
          // Prazo estourado ou rede ainda ruim: segue para o finish mesmo
          // assim — a questão conta como em branco, que é o comportamento da
          // prova real.
        }
      }

      try {
        const res = await apiFetch<SimuladoRelatorio>(
          `/simulado/sessions/${sessao.sessaoId}/finish`,
          { method: 'POST' },
        );
        localStorage.removeItem(CHAVE_SESSAO_ABERTA);
        setRelatorio(res);
        setFase('relatorio');
        if (res.xpGanho > 0) {
          addXP(res.xpGanho);
          void refreshPerfil();
        }
        if (automatico) toast('Tempo esgotado — veja como você foi.', { variant: 'info' });
      } catch (e) {
        finalizando.current = false;
        const msg = e instanceof ApiError ? e.message : 'Não foi possível finalizar o simulado.';
        toast(msg, { variant: 'error' });
      } finally {
        setCarregando(false);
      }
    },
    [sessao, addXP, refreshPerfil],
  );

  // Cronômetro zerou: finaliza sozinho — o servidor já não aceitaria respostas.
  useEffect(() => {
    if (fase === 'prova' && restante === 0) void finalizar(true);
  }, [fase, restante, finalizar]);

  // ── respostas ────────────────────────────────────────────────────────────

  const responder = useCallback(
    async (itemId: string, respostaId: string) => {
      if (!sessao) return;
      const tempoRespostaMs = Math.max(0, Date.now() - abertaEm.current);
      // Otimista: a marcação é imediata, o servidor confirma depois. Ele não
      // devolve acerto — só o total registrado.
      setRespostas((atual) => ({ ...atual, [itemId]: respostaId }));
      try {
        await apiFetch<SaveSimuladoAnswerResponse>(`/simulado/sessions/${sessao.sessaoId}/answers`, {
          method: 'POST',
          body: JSON.stringify({ itemId, respostaId, tempoRespostaMs }),
        });
        pendentes.current.delete(itemId);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'SIMULADO_EXPIRADO') {
          toast('O tempo acabou. Finalizando seu simulado…', { variant: 'error' });
          void finalizar(true);
          return;
        }
        // Guarda para reenviar no finish — perder resposta por oscilação de
        // rede seria o pior defeito possível numa prova.
        pendentes.current.set(itemId, { respostaId, tempoRespostaMs });
      }
    },
    [sessao, finalizar],
  );

  function irPara(novoIndice: number) {
    if (novoIndice < 0 || novoIndice >= questoes.length) return;
    setIndice(novoIndice);
    abertaEm.current = Date.now();
  }

  // ── telas ────────────────────────────────────────────────────────────────

  if (verificandoRetomada) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 p-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (fase === 'relatorio' && relatorio) {
    return <RelatorioSimulado relatorio={relatorio} onRefazer={() => setFase('config')} />;
  }

  if (fase === 'config') {
    return <TelaConfig carregando={carregando} erro={erro} onIniciar={iniciar} />;
  }

  if (!questao) return null;

  const tempoAcabando = restante != null && restante <= ALERTA_TEMPO_SEGUNDOS;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 pb-28">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="info">{rotuloArea(questao.area)}</Badge>
          {restante != null ? (
            <span
              className={cn(
                'font-mono text-lg font-bold tabular-nums',
                tempoAcabando ? 'animate-pulse text-error' : 'text-text',
              )}
              role="timer"
              aria-live={tempoAcabando ? 'polite' : 'off'}
            >
              {formatarDuracao(restante)}
            </span>
          ) : (
            <span className="text-sm text-text-muted">Sem cronômetro</span>
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>
            Questão {indice + 1} de {questoes.length}
          </span>
          <span>{respondidas} respondidas</span>
        </div>
        <Progress
          value={respondidas}
          max={questoes.length}
          gradient
          aria-label="Questões respondidas"
        />
      </div>

      <p className="max-w-[70ch] whitespace-pre-line text-base leading-relaxed">
        {questao.enunciado}
      </p>

      {questao.imagemUrl && (
        // <img> cru de propósito: a imagem vem do banco público do ENEM, em
        // host externo e dimensão desconhecida — next/image exigiria domínio
        // liberado e tamanho fixo.
        <img
          src={questao.imagemUrl}
          alt={`Imagem da questão ${indice + 1}`}
          className="max-w-full rounded-xl border border-border"
        />
      )}

      <div role="radiogroup" aria-label="Alternativas" className="space-y-2">
        {questao.alternativas.map((a) => (
          <OptionCard
            key={a.id}
            leading={a.id}
            title={a.texto}
            // Sem `state`: nesta tela não existe certo nem errado, só escolhido.
            selected={respostas[questao.itemId] === a.id}
            onClick={() => void responder(questao.itemId, a.id)}
          />
        ))}
      </div>

      <GradeNavegacao
        questoes={questoes}
        indice={indice}
        respostas={respostas}
        onIr={irPara}
      />

      {confirmandoFim ? (
        <Card variant="highlight" className="space-y-3 p-5">
          <p className="font-semibold">Finalizar o simulado?</p>
          <p className="text-sm text-text-muted">
            {emBranco > 0
              ? `${emBranco} ${emBranco === 1 ? 'questão continua' : 'questões continuam'} em branco e ${emBranco === 1 ? 'contará' : 'contarão'} como erro. Depois de finalizar não dá para voltar.`
              : 'Você respondeu todas. Depois de finalizar não dá para voltar.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="cta" onClick={() => void finalizar()} disabled={carregando}>
              {carregando ? 'Corrigindo…' : 'Finalizar e ver relatório'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmandoFim(false)} disabled={carregando}>
              Continuar respondendo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => irPara(indice - 1)}
            disabled={indice === 0}
          >
            Anterior
          </Button>
          {indice < questoes.length - 1 ? (
            <Button variant="primary" onClick={() => irPara(indice + 1)}>
              Próxima
            </Button>
          ) : (
            <Button variant="cta" onClick={() => setConfirmandoFim(true)}>
              Finalizar
            </Button>
          )}
        </div>
      )}

      {!confirmandoFim && indice < questoes.length - 1 && (
        <button
          type="button"
          className="w-full text-sm text-text-muted underline underline-offset-4"
          onClick={() => setConfirmandoFim(true)}
        >
          Finalizar simulado agora
        </button>
      )}
    </div>
  );
}

/** Grade de atalhos — numa prova longa, voltar numa questão marcada é essencial. */
function GradeNavegacao({
  questoes,
  indice,
  respostas,
  onIr,
}: {
  questoes: StartSimuladoResponse['questoes'];
  indice: number;
  respostas: Record<string, string>;
  onIr: (i: number) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-xs font-medium text-text-muted">
        Navegue entre as questões — respondidas ficam preenchidas
      </p>
      <div className="grid grid-cols-10 gap-1.5">
        {questoes.map((q, i) => {
          const respondida = respostas[q.itemId] != null;
          return (
            <button
              key={q.itemId}
              type="button"
              onClick={() => onIr(i)}
              aria-label={`Questão ${i + 1}${respondida ? ' (respondida)' : ' (em branco)'}`}
              aria-current={i === indice ? 'true' : undefined}
              className={cn(
                'aspect-square rounded-md border text-xs font-semibold transition',
                i === indice && 'ring-2 ring-brand-primary ring-offset-1 ring-offset-surface-2',
                respondida
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-border bg-surface text-text-muted hover:border-brand-primary',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── tela inicial ───────────────────────────────────────────────────────────

const OPCOES: {
  escolha: Escolha;
  titulo: string;
  descricao: string;
  recompensa: string;
  destaque?: boolean;
}[] = [
  {
    escolha: { modo: 'cronometrado', limiteMinutos: SIMULADO_LIMITES_MINUTOS[0] },
    titulo: '1 hora',
    descricao: 'Ritmo apertado, mais próximo da pressão real da prova.',
    recompensa: 'XP máximo — 1,5× por acerto',
    destaque: true,
  },
  {
    escolha: { modo: 'cronometrado', limiteMinutos: SIMULADO_LIMITES_MINUTOS[1] },
    titulo: '1h30',
    descricao: 'Tempo para ler com calma sem perder o senso de urgência.',
    recompensa: 'XP alto — 1,25× por acerto',
  },
  {
    escolha: { modo: 'livre' },
    titulo: 'Sem cronômetro',
    descricao: 'Sem pressão de tempo, para treinar conteúdo.',
    recompensa: 'XP reduzido (0,4×) e só acima de 70% de acerto',
  },
];

function TelaConfig({
  carregando,
  erro,
  onIniciar,
}: {
  carregando: boolean;
  erro: string | null;
  onIniciar: (escolha: Escolha) => void;
}) {
  const [selecionada, setSelecionada] = useState(0);
  const opcao = OPCOES[selecionada]!;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold">Simulado ENEM</h1>
        <p className="text-text-muted">
          {SIMULADO_TOTAL_QUESTOES} questões — {SIMULADO_QUESTOES_POR_AREA} de cada área, em três
          níveis de dificuldade. Você só descobre o que acertou no fim, como numa prova de verdade.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Escolha como quer fazer</p>
        {OPCOES.map((o, i) => (
          <OptionCard
            key={o.titulo}
            leading={o.escolha.modo === 'livre' ? '∞' : '⏱'}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {o.titulo}
                {o.destaque && <Badge variant="brand">Mais XP</Badge>}
              </span>
            }
            description={
              <span className="block space-y-1">
                <span className="block">{o.descricao}</span>
                <span className="block text-xs font-medium text-brand-primary">{o.recompensa}</span>
              </span>
            }
            selected={selecionada === i}
            onClick={() => setSelecionada(i)}
          />
        ))}
      </div>

      <Card className="space-y-2 p-4 text-sm text-text-muted">
        <p className="font-semibold text-text">Como funciona</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Você pode navegar entre as questões e trocar de resposta quando quiser.</li>
          <li>Nada de certo ou errado durante a prova — o relatório vem no fim.</li>
          <li>Questão em branco conta como erro.</li>
          <li>Quanto menor o tempo escolhido, maior o XP por acerto.</li>
        </ul>
      </Card>

      {erro && (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="secondary" size="lg">
          <Link href="/dashboard">Voltar</Link>
        </Button>
        <Button
          variant="cta"
          size="lg"
          onClick={() => onIniciar(opcao.escolha)}
          disabled={carregando}
        >
          {carregando ? 'Montando sua prova…' : 'Começar simulado'}
        </Button>
      </div>
      {carregando && (
        <p className="text-center text-xs text-text-muted">
          Montando {SIMULADO_TOTAL_QUESTOES} questões — isso pode levar alguns segundos.
        </p>
      )}
    </div>
  );
}
