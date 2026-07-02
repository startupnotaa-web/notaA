'use client';
// Onboarding real (E1, doc 05 §3) — 8 passos com salvamento incremental (A6):
// cada "Continuar" persiste via PUT /onboarding/steps/:n (contrato exato em
// @notaa/contracts OnboardingStepSchemas); ao montar, retoma de GET
// /onboarding/state. Passo 7 (neurodivergência) é opcional por design (I10,
// doc 10 §3) — pode ser pulado sem payload. Visual: progresso em gradiente
// (doc 07 §3), Switches/Chips acessíveis (doc 07 §7).
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { OnboardingState } from '@notaa/contracts';
import { Button, Chip, Input, Label, OptionCard, Progress, Switch, cn } from '@notaa/ui';
import { apiFetch, ApiError } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { useUser } from '../../lib/user-context';

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
        const d = estado.dados as Record<string, Record<string, any> | undefined>;
        if (d.passo1) {
          setNome((d.passo1.nome as string) ?? '');
          if (d.passo1.idade) setIdade(String(d.passo1.idade));
          if (d.passo1.serie) setSerie(d.passo1.serie as string);
        }
        if (d.passo2) setCurso((d.passo2.objetivoEnem as string) ?? null);
        if (d.passo3?.estiloAprendizagemAutodeclarado)
          setComoAprende((d.passo3.estiloAprendizagemAutodeclarado.comoAprendeMelhor as string[]) ?? []);
        if (d.passo4) setDificuldades((d.passo4.dificuldades as string[]) ?? []);
        if (d.passo5?.rotinaEstudo)
          setMinutosPorDia(
            d.passo5.rotinaEstudo.minutosPorDia != null ? String(d.passo5.rotinaEstudo.minutosPorDia) : '',
          );
        if (d.passo6?.autopercepcao)
          setAutopercepcao((d.passo6.autopercepcao.nivelAutopercebido as string) ?? null);
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
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente novamente.');
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
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-text-muted">Carregando...</div>
      </main>
    );
  }

  const podeAvancar =
    (step === 1 && nome.trim().length > 0 && idade !== '' && Number(idade) > 0 && serie != null) ||
    (step === 2 && curso != null) ||
    step === 3 ||
    step === 4 ||
    step === 5 ||
    (step === 6 && autopercepcao != null) ||
    step === 7 ||
    step === 8;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-6 py-8">
      <div className="mb-8">
        <Progress value={step} max={TOTAL} label={`Passo ${step} de ${TOTAL}`} gradient />
      </div>

      <div className="flex flex-1 flex-col">
        {step === 1 && (
          <Step center>
            <Image src="/brand/logo-full.png" alt="Nota A" width={200} height={130} priority />
            <h1 className="text-2xl font-bold">Boas-vindas ao Nota A</h1>
            <p className="text-text-muted">Vamos montar um plano de estudos que se adapta a você.</p>
            <div className="w-full space-y-4 pt-2 text-left">
              <div className="space-y-1">
                <Label htmlFor="nome">Como podemos te chamar?</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="idade">Qual é a sua idade?</Label>
                <Input
                  id="idade"
                  type="number"
                  min={1}
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  placeholder="Sua idade"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="serie">Em qual ano escolar você está?</Label>
                <div role="radiogroup" aria-label="Série Escolar" className="space-y-2">
                  <OptionCard title="Ensino Médio - 1º Ano" selected={serie === 'EM1'} onClick={() => setSerie('EM1')} />
                  <OptionCard title="Ensino Médio - 2º Ano" selected={serie === 'EM2'} onClick={() => setSerie('EM2')} />
                  <OptionCard title="Ensino Médio - 3º Ano" selected={serie === 'EM3'} onClick={() => setSerie('EM3')} />
                  <OptionCard title="Pré-vestibular / Cursinho" selected={serie === 'CURSINHO'} onClick={() => setSerie('CURSINHO')} />
                </div>
              </div>
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step>
            <h1 className="text-2xl font-bold">Qual é o seu curso dos sonhos?</h1>
            <p className="text-text-muted">Selecione o curso que você tem como objetivo.</p>
            <div role="radiogroup" aria-label="Curso" className="space-y-2 pt-2">
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
            <h1 className="text-2xl font-bold">Como você aprende melhor?</h1>
            <p className="text-text-muted">Escolha quantas opções quiser.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {COMO_APRENDE.map((o) => (
                <Chip
                  key={o}
                  selected={comoAprende.includes(o)}
                  onClick={() => toggle(comoAprende, setComoAprende, o)}
                >
                  {o}
                </Chip>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step>
            <h1 className="text-2xl font-bold">Onde você sente mais dificuldade?</h1>
            <p className="text-text-muted">Isso ajuda a priorizar o que estudar primeiro.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {DIFICULDADES.map((o) => (
                <Chip
                  key={o}
                  selected={dificuldades.includes(o)}
                  onClick={() => toggle(dificuldades, setDificuldades, o)}
                >
                  {o}
                </Chip>
              ))}
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step>
            <h1 className="text-2xl font-bold">Qual sua rotina de estudo?</h1>
            <div className="space-y-1 pt-2">
              <Label htmlFor="minutos">Quantos minutos por dia você tem disponível para estudar?</Label>
              <Input
                id="minutos"
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
            <h1 className="text-2xl font-bold">Como você se vê hoje?</h1>
            <p className="text-text-muted">Não existe resposta errada — isso é só um ponto de partida.</p>
            <div role="radiogroup" aria-label="Autopercepção" className="space-y-2 pt-2">
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
            <h1 className="text-2xl font-bold">Como podemos te apoiar melhor?</h1>
            <p className="text-text-muted">
              Etapa opcional. Compartilhar isso nos ajuda a adaptar a experiência para você.
            </p>
            <ul className="flex flex-col gap-2 pt-2">
              <PrefRow id="pref-dislexia" title="Dislexia" checked={dislexia} onChange={setDislexia} />
              <PrefRow id="pref-tdah" title="TDAH" checked={tdah} onChange={setTdah} />
              <PrefRow id="pref-tea" title="TEA" checked={tea} onChange={setTea} />
            </ul>
            {(dislexia || tdah || tea) && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
                <p id="pref-consent" className="text-sm text-text-muted">
                  Autorizo usar essas informações só para personalizar minha experiência no Nota A.
                </p>
                <Switch checked={consentimento} onCheckedChange={setConsentimento} aria-labelledby="pref-consent" />
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={pularPasso7} disabled={salvando} className="self-start">
              Pular esta etapa
            </Button>
          </Step>
        )}

        {step === 8 && (
          <Step center>
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-2xl"
              aria-hidden="true"
            >
              🚀
            </span>
            <h1 className="text-2xl font-bold">Tudo pronto, {nome || 'estudante'}!</h1>
            <div className="w-full rounded-lg border border-border bg-surface-2 p-4 text-left shadow-1">
              <h2 className="mb-3 text-lg font-bold text-text">Resumo das suas escolhas:</h2>
              <ul className="space-y-2 text-sm text-text-muted">
                <li><strong className="text-text">Idade e Série:</strong> {idade} anos, {serie}</li>
                <li><strong className="text-text">Curso:</strong> {CURSOS.find(c => c.id === curso)?.titulo || '-'}</li>
                <li><strong className="text-text">Estilo:</strong> {comoAprende.join(', ') || '-'}</li>
                <li><strong className="text-text">Tempo:</strong> {minutosPorDia ? `${minutosPorDia} min/dia` : '-'}</li>
                <li><strong className="text-text">Neurodivergência:</strong> {[dislexia && 'Dislexia', tdah && 'TDAH', tea && 'TEA'].filter(Boolean).join(', ') || 'Nenhuma'}</li>
              </ul>
            </div>
          </Step>
        )}
      </div>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-error">
          {erro}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || salvando}
        >
          Voltar
        </Button>
        <Button
          variant={step === TOTAL ? 'cta' : 'primary'}
          onClick={avancar}
          disabled={!podeAvancar || salvando}
        >
          {salvando ? 'Salvando...' : step === TOTAL ? 'Começar minha jornada' : 'Continuar'}
        </Button>
      </div>
    </main>
  );
}

function Step({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-3',
        center && 'items-center justify-center text-center',
      )}
    >
      {children}
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
    <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
      <p id={id} className="font-medium text-text">
        {title}
      </p>
      <Switch checked={checked} onCheckedChange={onChange} aria-labelledby={id} />
    </li>
  );
}
