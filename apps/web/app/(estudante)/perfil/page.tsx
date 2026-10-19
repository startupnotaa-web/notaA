'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Lock, Map as MapaIcon, Target, Trophy, Users } from 'lucide-react';
import type { MeResponse, AchievementsResponse } from '@notaa/contracts';
import {
  Button,
  Carregando,
  Chip,
  Notice,
  PageHeader,
  Panel,
  Section,
  Skeleton,
  TextField,
  ThemeSwitch,
} from '@notaa/ui';
import { MinhasTurmas } from './MinhasTurmas';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-context';
import { aplicarPreferenciaDeTema, lerPreferenciaDeTema, type PreferenciaDeTema } from '../../../lib/tema';
import { Atalho, AtalhoLista } from '../../components/Atalho';
import { Pagina } from '../../components/Pagina';

const PLANO_ROTULO: Record<NonNullable<MeResponse['plano']>['tipo'], string> = {
  free: 'Gratuito',
  plus: 'Premium',
  instituicao: 'Instituição',
};

const MARCOS_DE_OFENSIVA = [
  { label: '3 dias', codigo: 'streak_3_dias' },
  { label: '7 dias', codigo: 'streak_7_dias' },
  { label: '15 dias', codigo: 'streak_15_dias' },
  { label: '1 mês', codigo: 'streak_30_dias' },
  { label: '2 meses', codigo: 'streak_60_dias' },
  { label: '4 meses', codigo: 'streak_120_dias' },
  { label: '8 meses', codigo: 'streak_240_dias' },
];

export default function PerfilPage() {
  const { signOut } = useAuth();
  const [perfil, setPerfil] = useState<MeResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tema, setTema] = useState<PreferenciaDeTema>('light');

  // Estado do formulário de Informações Pessoais.
  const [nome, setNome] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [estilo, setEstilo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);

  // Mensagem da seção de assinatura
  const [assinaturaMsg, setAssinaturaMsg] = useState<string | null>(null);

  useEffect(() => {
    setTema(lerPreferenciaDeTema());
    Promise.all([
      apiFetch<MeResponse>('/me'),
      apiFetch<AchievementsResponse>('/me/achievements')
    ])
      .then(([perfilData, achData]) => {
        setPerfil(perfilData);
        setNome(perfilData.nome ?? '');
        setObjetivo(perfilData.objetivo ?? '');
        setEstilo(perfilData.estiloAprendizagem?.join(', ') ?? '');
        setAchievements(achData);
      })
      .catch((e) => {
        setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar seu perfil.');
      });
  }, []);

  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setFeedback({ tipo: 'erro', msg: 'Informe seu nome.' });
      return;
    }
    setSalvando(true);
    setFeedback(null);
    try {
      const atualizado = await apiFetch<MeResponse>('/me', {
        method: 'PATCH',
        body: JSON.stringify({ 
          nome: nomeLimpo,
          objetivoEnem: objetivo.trim() || null,
          estiloAprendizagem: estilo.trim() ? estilo.split(',').map(s => s.trim()) : null,
        }),
      });
      setPerfil(atualizado);
      setNome(atualizado.nome ?? '');
      setObjetivo(atualizado.objetivo ?? '');
      setEstilo(atualizado.estiloAprendizagem?.join(', ') ?? '');
      setFeedback({ tipo: 'ok', msg: 'Informações salvas.' });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        msg: err instanceof ApiError ? err.message : 'Não foi possível salvar suas informações.',
      });
    } finally {
      setSalvando(false);
    }
  }

  if (erro) {
    return (
      <Pagina>
        <Notice tone="danger" title="Não foi possível abrir o seu perfil">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!perfil) {
    return <PerfilSkeleton />;
  }

  const planoTipo = perfil.plano?.tipo ?? 'free';
  const planoRotulo = PLANO_ROTULO[planoTipo];
  const isPremium = planoTipo === 'plus';
  const nomeInalterado = nome.trim() === (perfil.nome ?? '').trim();
  const objetivoInalterado = objetivo.trim() === (perfil.objetivo ?? '').trim();
  const estiloInalterado = estilo.trim() === (perfil.estiloAprendizagem?.join(', ') ?? '').trim();
  const inalterado = nomeInalterado && objetivoInalterado && estiloInalterado;

  return (
    <Pagina>
      {/* Identidade */}
      <div className="flex items-center gap-space-5">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-violet-tint font-display text-heading-2 text-primary"
        >
          {perfil.nome ? perfil.nome.charAt(0).toUpperCase() : 'N'}
        </div>
        <PageHeader
          className="flex-1"
          title={perfil.nome ? perfil.nome : 'Estudante Nota A'}
          description={perfil.email}
          status={
            <span className="flex flex-wrap items-center gap-space-2">
              <Chip tone="neutral">Nível {perfil.gamificacao?.nivel?.atual || 1}</Chip>
              <Chip tone={perfil.plano?.status === 'ativa' ? 'brand' : 'neutral'}>Plano {planoRotulo}</Chip>
            </span>
          }
        />
      </div>

      <Section title="Jornada e conquistas">
        <AtalhoLista>
          <Atalho
            icone={<Trophy className="h-5 w-5" />}
            titulo="Certificados"
            descricao="Conquistas e medalhas verificáveis da sua jornada."
            href="/certificados"
          />
          <Atalho
            icone={<BookOpen className="h-5 w-5" />}
            titulo="Minha narrativa"
            descricao="Conecte seu sonho ao estudo e veja a linha do tempo."
            href="/minha-narrativa"
          />
          <Atalho
            icone={<MapaIcon className="h-5 w-5" />}
            titulo="Mapa do conhecimento"
            descricao="Seus pontos fortes e as lacunas de estudo, por área."
            href="/mapa-conhecimento"
          />
          <Atalho
            icone={<Target className="h-5 w-5" />}
            titulo="Previsão de nota"
            descricao="Uma estimativa do seu desempenho no ENEM, com base no que você já fez."
            href="/previsao-nota"
          />
          <Atalho
            icone={<Users className="h-5 w-5" />}
            titulo="Relatório familiar"
            descricao="Um resumo do seu progresso para pais e responsáveis."
            href="/relatorio-familiar"
          />
        </AtalhoLista>
      </Section>

      {achievements && (
        <Section title="Certificados de ofensiva" description="Marcos de dias seguidos estudando." divided>
          <ul className="m-0 flex list-none flex-col p-0">
            {MARCOS_DE_OFENSIVA.map((marco) => {
              const unlocked = achievements.desbloqueadas.some((a) => a.codigo === marco.codigo);
              return (
                <li key={marco.codigo} className="flex min-h-[44px] items-center justify-between gap-space-4 border-b border-line py-space-2 last:border-b-0">
                  <span className="flex items-center gap-space-3 text-body text-ink">
                    {unlocked ? (
                      <Trophy aria-hidden="true" className="h-5 w-5 text-primary" />
                    ) : (
                      <Lock aria-hidden="true" className="h-5 w-5 text-ink-muted" />
                    )}
                    {marco.label}
                  </span>
                  <Chip tone={unlocked ? 'brand' : 'neutral'}>{unlocked ? 'Conquistado' : 'Bloqueado'}</Chip>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Informações pessoais" divided>
        <Panel>
          <form className="flex flex-col gap-space-5" onSubmit={handleSalvarPerfil}>
            <div className="grid gap-space-5 md:grid-cols-2">
              <TextField
                label="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como você quer ser chamado(a)"
                maxLength={120}
                autoComplete="name"
                disabled={salvando}
              />
              <TextField
                label="E-mail"
                type="email"
                value={perfil.email}
                disabled
                readOnly
                hint="O e-mail não pode ser alterado aqui. Fale com o suporte."
              />
            </div>
            <TextField
              label="Objetivo ou curso"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ex.: Medicina, Direito"
              disabled={salvando}
            />
            <TextField
              label="Estilo de aprendizado"
              hint="Separe por vírgula."
              value={estilo}
              onChange={(e) => setEstilo(e.target.value)}
              placeholder="Ex.: visual, auditivo, leitura, prático"
              disabled={salvando}
            />

            {feedback && <Notice tone={feedback.tipo === 'erro' ? 'danger' : 'success'}>{feedback.msg}</Notice>}

            <div>
              <Button type="submit" loading={salvando} disabled={inalterado}>
                {salvando ? 'Salvando' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Panel>
      </Section>

      <MinhasTurmas />

      <Section
        title="Aparência"
        description="O tema claro é o padrão. Você pode trocar para o escuro ou seguir o seu sistema."
        divided
      >
        <div>
          <ThemeSwitch
            value={tema}
            onChange={(valor) => {
              setTema(valor);
              aplicarPreferenciaDeTema(valor);
            }}
          />
        </div>
      </Section>

      <Section title="Sua assinatura" divided>
        <div className="flex flex-wrap items-center justify-between gap-space-5">
          <div className="flex flex-col gap-space-1">
            <p className="m-0 text-label text-ink-muted">Plano atual</p>
            <p className="m-0 font-display text-heading-2 text-ink">{planoRotulo}</p>
            {perfil.plano?.status && perfil.plano.status !== 'ativa' && (
              <div>
                <Chip tone="neutral">Status: {perfil.plano.status}</Chip>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-space-3">
            <Button
              variant="primary"
              disabled={isPremium}
              onClick={() => setAssinaturaMsg('Os pagamentos chegam em breve. Deixamos o seu interesse no Premium registrado.')}
            >
              {isPremium ? 'Você já é Premium' : 'Fazer upgrade'}
            </Button>
            <Button
              variant="danger"
              disabled={!isPremium}
              onClick={() => setAssinaturaMsg('O downgrade estará disponível assim que ativarmos os pagamentos.')}
            >
              Cancelar plano
            </Button>
          </div>
        </div>
        {assinaturaMsg && <Notice tone="info">{assinaturaMsg}</Notice>}
      </Section>

      <Section divided>
        <div>
          <Button variant="secondary" onClick={signOut}>
            Sair da conta
          </Button>
        </div>
      </Section>
    </Pagina>
  );
}

function PerfilSkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando o seu perfil" className="flex flex-col gap-space-6 md:gap-space-7">
        <div className="flex items-center gap-space-5">
          <Skeleton className="h-16 w-16 rounded-pill" />
          <div className="flex w-full flex-col gap-space-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </Carregando>
    </Pagina>
  );
}
