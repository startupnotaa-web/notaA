'use client';
// Onboarding real (E1, doc 05 §3) — 8 passos com salvamento incremental (A6):
// cada "Continuar" persiste via PUT /onboarding/steps/:n (contrato exato em
// @notaa/contracts OnboardingStepSchemas); ao montar, retoma de GET
// /onboarding/state. Passo 7 (neurodivergência) é opcional por design (I10,
// doc 10 §3) — pode ser pulado sem payload. Visual: progresso em `primary`, uma
// pergunta por tela, Switches/Chips acessíveis (doc 07 §7).
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingState } from '@notaa/contracts';
import { Button, ChoiceChip, Inset, Notice, NotaASimbolo, OptionCard, Progress, Switch, TextField } from '@notaa/ui';
import { apiFetch, ApiError } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { useUser } from '../../lib/user-context';
import { TelaCarregando } from '../components/TelaCarregando';

const TOTAL = 8;

const CURSOS = [
  { id: 'medicina', titulo: 'Medicina' },
  { id: 'direito', titulo: 'Direito' },
  { id: 'engenharia', titulo: 'Engenharia' },
  { id: 'ti', titulo: 'Tecnologia / TI' },
  { id: 'outro', titulo: 'Outro' },
];
const COMO_APRENDE = ['Visual', 'Auditivo', 'Prático'];
const DIFICULDADES = [
  'Matemática',
  'Redação',
  'Linguagens',
  'Ciências da Natureza',
  'Ciências Humanas',
];
const AUTOPERCEPCAO = [
  { id: 'passo_a_passo', titulo: 'Passo a passo (Teoria e Prática guiada)' },
  { id: 'desafio', titulo: 'Desafio (Foco em questões e simulados)' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { refreshPerfil } = useUser();

  const [carregandoEstado, setCarregandoEstado] = useState(true);
  const [step, setStep] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Campos de cada passo (pré-preenchidos ao retomar um onboarding em andamento).
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [serie, setSerie] = useState<string | null>(null);
  const [curso, setCurso] = useState<string | null>(null);
  const [comoAprende, setComoAprende] = useState<string[]>([]);
  const [dificuldades, setDificuldades] = useState<string[]>([]);
  const [minutosPorDia, setMinutosPorDia] = useState('');
  const [autopercepcao, setAutopercepcao] = useState<string | null>(null);
  const [dislexia, setDislexia] = useState(false);
  const [tdah, setTdah] = useState(false);
  const [tea, setTea] = useState(false);
  const [consentimento, setConsentimento] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    apiFetch<OnboardingState>('/onboarding/state')
      .then((estado) => {
        if (estado.concluido) {
          router.replace('/dashboard');
          return;
        }
        // As formas de cada `passoN` espelham o schema Zod do passo (o backend
        // reconstrói exatamente o payload aceito por PUT /onboarding/steps/:n),
        // então o pré-preenchimento ao retomar lê o mesmo caminho que enviou.
        const d = estado.dados as Record<string, Record<string, unknown> | undefined>;
        if (d.passo1) {
          setNome((d.passo1.nome as string) ?? '');
          if (d.passo1.idade) setIdade(String(d.passo1.idade));
          if (d.passo1.serie) setSerie(d.passo1.serie as string);
        }
        if (d.passo2) setCurso((d.passo2.objetivoEnem as string) ?? null);
        const estilo = d.passo3?.estiloAprendizagemAutodeclarado as
          | { comoAprendeMelhor?: string[] }
          | undefined;
        if (estilo) setComoAprende(estilo.comoAprendeMelhor ?? []);
        if (d.passo4) setDificuldades((d.passo4.dificuldades as string[]) ?? []);
        const rotina = d.passo5?.rotinaEstudo as { minutosPorDia?: number | null } | undefined;
        if (rotina)
          setMinutosPorDia(rotina.minutosPorDia != null ? String(rotina.minutosPorDia) : '');
        const autopercepcao = d.passo6?.autopercepcao as { nivelAutopercebido?: string } | undefined;
        if (autopercepcao) setAutopercepcao(autopercepcao.nivelAutopercebido ?? null);
        if (d.passo7) {
          const n = (d.passo7.neurodivergencia as Record<string, boolean>) ?? {};
          setDislexia(!!n.dislexia);
          setTdah(!!n.tdah);
          setTea(!!n.tea);
          setConsentimento(!!d.passo7.consentimentoBaseLegal);
        }
        setStep(Math.min(estado.passoAtual, TOTAL));
      })
      .catch(() => {
        // Fallback removido. Se não carregar o estado (por ex, primeira vez), 
        // segue do passo 1 normalmente.
      })
      .finally(() => setCarregandoEstado(false));
  }, [authLoading, session, router]);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  function payloadDoPasso(passo: number): Record<string, unknown> {
    switch (passo) {
      case 1:
        return { nome, idade: Number(idade), serie };
      case 2:
        return { objetivoEnem: curso };
      case 3:
        return { estiloAprendizagemAutodeclarado: { comoAprendeMelhor: comoAprende } };
      case 4:
        return { dificuldades };
      case 5:
        return { rotinaEstudo: { ...(minutosPorDia ? { minutosPorDia: Number(minutosPorDia) } : {}) } };
      case 6:
        return { autopercepcao: { nivelAutopercebido: autopercepcao } };
      case 7:
        // <18 nunca envia dado sensível (LGPD/ECA — o backend também rejeita):
        // o passo vira um "pular" implícito até existir consentimento do responsável.
        if (Number(idade) < 18) return {};
        return {
          ...((dislexia || tdah || tea) && { neurodivergencia: { dislexia, tdah, tea } }),
          ...(consentimento && { consentimentoBaseLegal: 'aceito' }),
        };
      case 8:
        return { confirmado: true };
      default:
        return {};
    }
  }

  async function avancar() {
    setErro(null);
    setSalvando(true);
    try {
      await apiFetch(`/onboarding/steps/${step}`, {
        method: 'PUT',
        body: JSON.stringify(payloadDoPasso(step)),
      });
      if (step === TOTAL) {
        await apiFetch('/onboarding/complete', { method: 'POST' });
        localStorage.removeItem('notaA_onboarding');
        await refreshPerfil();
        // Após o passo 8 concluído (201), vai direto ao Dashboard.
        router.push('/dashboard');
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      console.error(e);
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  async function pularPasso7() {
    setErro(null);
    setSalvando(true);
    try {
      await apiFetch('/onboarding/steps/7', { method: 'PUT', body: JSON.stringify({}) });
      setStep(8);
    } catch (e) {
      console.error(e);
      setErro(e instanceof ApiError ? e.message : 'Não foi possível pular esta etapa.');
    } finally {
      setSalvando(false);
    }
  }

  if (authLoading || carregandoEstado) {
    return <TelaCarregando rotulo="Carregando seu cadastro" />;
  }

  const podeAvancar =
    (step === 1 && nome.trim().length > 0 && idade !== '' && Number(idade) > 0 && serie != null) ||
    (step === 2 && curso != null) ||
    step === 3 ||
    step === 4 ||
    step === 5 ||
    (step === 6 && autopercepcao != null) ||
    // Passo 7: marcou neurodivergência (≥18) → consentimento explícito obrigatório
    // (o backend rejeita sem ele); <18 não envia dado sensível, sempre pode seguir.
    (step === 7 && (Number(idade) < 18 || !(dislexia || tdah || tea) || consentimento)) ||
    step === 8;

  return (
    <main id="conteudo" className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-space-6">
      <div className="mb-space-7">
        <Progress value={step} max={TOTAL} label={`Passo ${step} de ${TOTAL}`} />
      </div>

      <div className="flex flex-1 flex-col">
        {step === 1 && (
          <Step>
            <NotaASimbolo className="h-12 w-auto self-start" titulo="Nota A" />
            <h1 className={TITULO}>Boas-vindas ao Nota A</h1>
            <p className="m-0 text-body text-ink-muted">Vamos montar um plano de estudos que se adapta a você.</p>
            <div className="flex w-full flex-col gap-space-5 pt-space-2">
              <TextField
                label="Como podemos te chamar?"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                autoComplete="given-name"
                autoFocus
              />
              <TextField
                label="Qual é a sua idade?"
                type="number"
                min={1}
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                placeholder="Sua idade"
              />
              <div className="flex flex-col gap-space-2">
                <p id="serie-rotulo" className="m-0 text-label text-ink">
                  Em qual ano escolar você está?
                </p>
                <div role="radiogroup" aria-labelledby="serie-rotulo" className="flex flex-col gap-space-3">
                  <OptionCard title="Ensino médio, 1º ano" selected={serie === 'EM1'} onClick={() => setSerie('EM1')} />
                  <OptionCard title="Ensino médio, 2º ano" selected={serie === 'EM2'} onClick={() => setSerie('EM2')} />
                  <OptionCard title="Ensino médio, 3º ano" selected={serie === 'EM3'} onClick={() => setSerie('EM3')} />
                  <OptionCard title="Pré-vestibular ou cursinho" selected={serie === 'CURSINHO'} onClick={() => setSerie('CURSINHO')} />
                </div>
              </div>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step>
            <h1 className={TITULO}>Qual é o seu curso dos sonhos?</h1>
            <p className="m-0 text-body text-ink-muted">Selecione o curso que você tem como objetivo.</p>
            <div role="radiogroup" aria-label="Curso" className="flex flex-col gap-space-3 pt-space-2">
              {CURSOS.map((c) => (
                <OptionCard
                  key={c.id}
                  title={c.titulo}
                  selected={curso === c.id}
                  onClick={() => setCurso(c.id)}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step>
            <h1 className={TITULO}>Como você aprende melhor?</h1>
            <p className="m-0 text-body text-ink-muted">Escolha quantas opções quiser.</p>
            <div className="flex flex-wrap gap-space-3 pt-space-2">
              {COMO_APRENDE.map((o) => (
                <ChoiceChip
                  key={o}
                  selected={comoAprende.includes(o)}
                  onClick={() => toggle(comoAprende, setComoAprende, o)}
                >
                  {o}
                </ChoiceChip>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step>
            <h1 className={TITULO}>Onde você sente mais dificuldade?</h1>
            <p className="m-0 text-body text-ink-muted">Isso ajuda a priorizar o que estudar primeiro.</p>
            <div className="flex flex-wrap gap-space-3 pt-space-2">
              {DIFICULDADES.map((o) => (
                <ChoiceChip
                  key={o}
                  selected={dificuldades.includes(o)}
                  onClick={() => toggle(dificuldades, setDificuldades, o)}
                >
                  {o}
                </ChoiceChip>
              ))}
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step>
            <h1 className={TITULO}>Qual sua rotina de estudo?</h1>
            <div className="pt-space-2">
              <TextField
                label="Quantos minutos por dia você tem disponível para estudar?"
                type="number"
                min={0}
                value={minutosPorDia}
                onChange={(e) => setMinutosPorDia(e.target.value)}
                placeholder="Ex.: 60"
              />
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step>
            <h1 className={TITULO}>Como você se vê hoje?</h1>
            <p className="m-0 text-body text-ink-muted">Não existe resposta errada. É só um ponto de partida.</p>
            <div role="radiogroup" aria-label="Autopercepção" className="flex flex-col gap-space-3 pt-space-2">
              {AUTOPERCEPCAO.map((o) => (
                <OptionCard
                  key={o.id}
                  title={o.titulo}
                  selected={autopercepcao === o.id}
                  onClick={() => setAutopercepcao(o.id)}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 7 && (
          <Step>
            <h1 className={TITULO}>Como podemos te apoiar melhor?</h1>
            <p className="m-0 text-body text-ink-muted">
              Etapa opcional. Compartilhar isso nos ajuda a adaptar a experiência para você.
            </p>
            {Number(idade) < 18 ? (
              // LGPD/ECA (doc 10 §3): dado sensível de menor exige consentimento
              // do responsável — o backend rejeita a gravação para <18, então o
              // formulário nem é oferecido. O passo continua opcional (pular).
              <Notice tone="info">
                Como você tem menos de 18 anos, o registro dessas informações precisa do consentimento de um responsável.
                Estamos preparando esse recurso. Por enquanto, pule esta etapa: você poderá adicionar depois, junto com o
                seu responsável.
              </Notice>
            ) : (
              <>
                <ul className="m-0 flex list-none flex-col p-0 pt-space-2">
                  <PrefRow id="pref-dislexia" title="Dislexia" checked={dislexia} onChange={setDislexia} />
                  <PrefRow id="pref-tdah" title="TDAH" checked={tdah} onChange={setTdah} />
                  <PrefRow id="pref-tea" title="TEA" checked={tea} onChange={setTea} />
                </ul>
                {(dislexia || tdah || tea) && (
                  <Inset className="flex items-center justify-between gap-space-4">
                    <p id="pref-consent" className="m-0 text-body-sm text-ink">
                      Autorizo usar essas informações só para personalizar minha experiência no Nota A.
                    </p>
                    <Switch checked={consentimento} onCheckedChange={setConsentimento} aria-labelledby="pref-consent" />
                  </Inset>
                )}
              </>
            )}
            <Button variant="quiet" onClick={pularPasso7} disabled={salvando} className="self-start">
              Pular esta etapa
            </Button>
          </Step>
        )}

        {step === 8 && (
          <Step>
            <h1 className={TITULO}>Tudo pronto, {nome || 'estudante'}!</h1>
            <p className="m-0 text-body text-ink-muted">Confira o resumo das suas escolhas antes de começar.</p>
            <Inset>
              <dl className="m-0 flex flex-col gap-space-3 text-body-sm">
                <ResumoLinha rotulo="Idade e série" valor={`${idade} anos, ${serie}`} />
                <ResumoLinha rotulo="Curso" valor={CURSOS.find((c) => c.id === curso)?.titulo || '–'} />
                <ResumoLinha rotulo="Estilo" valor={comoAprende.join(', ') || '–'} />
                <ResumoLinha rotulo="Tempo" valor={minutosPorDia ? `${minutosPorDia} min por dia` : '–'} />
                <ResumoLinha
                  rotulo="Neurodivergência"
                  valor={[dislexia && 'Dislexia', tdah && 'TDAH', tea && 'TEA'].filter(Boolean).join(', ') || 'Nenhuma'}
                />
              </dl>
            </Inset>
          </Step>
        )}
      </div>

      {erro && (
        <div className="mt-space-5">
          <Notice tone="danger">{erro}</Notice>
        </div>
      )}

      <div className="mt-space-6 flex items-center justify-between gap-space-3">
        <Button
          variant="quiet"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || salvando}
        >
          Voltar
        </Button>
        <Button variant="primary" onClick={avancar} disabled={!podeAvancar} loading={salvando}>
          {salvando ? 'Salvando' : step === TOTAL ? 'Começar minha jornada' : 'Continuar'}
        </Button>
      </div>
    </main>
  );
}

const TITULO = 'm-0 font-display text-[28px] leading-9 tracking-[-0.02em] text-ink sm:text-heading-1';

function Step({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col gap-space-4">{children}</div>;
}

function ResumoLinha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-space-4">
      <dt className="text-ink-muted">{rotulo}</dt>
      <dd className="m-0 font-bold text-ink">{valor}</dd>
    </div>
  );
}

function PrefRow({
  id,
  title,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex min-h-[44px] items-center justify-between gap-space-4 border-b border-line py-space-2 last:border-b-0">
      <p id={id} className="m-0 text-body font-bold text-ink">
        {title}
      </p>
      <Switch checked={checked} onCheckedChange={onChange} aria-labelledby={id} />
    </li>
  );
}
