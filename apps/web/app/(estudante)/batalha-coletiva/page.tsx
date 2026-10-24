'use client';
import { useEffect, useState } from 'react';
import { CircleCheck, Clock, Flame, Trophy } from 'lucide-react';
import type { DashboardResponse } from '@notaa/contracts';
import { Button, Carregando, Chip, Notice, PageHeader, Panel, Section, Skeleton } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { Voltar } from '../../components/Voltar';

// Mock list of players in the lobby
const MOCK_PLAYERS = [
  { id: 1, nome: 'Ana Costa', instituicao: 'Colegio Estadual - SP', nivel: 12 },
  { id: 2, nome: 'Lucas M.', instituicao: 'ETEC - SP', nivel: 9 },
  { id: 3, nome: 'Sofia R.', instituicao: 'Colegio Santa Cruz', nivel: 15 },
  { id: 4, nome: 'Pedro Henrique', instituicao: 'Colegio Objetivo', nivel: 8 },
  { id: 5, nome: 'Julia F.', instituicao: 'Poliedro', nivel: 22 },
  { id: 6, nome: 'Matheus G.', instituicao: 'Anglo', nivel: 14 },
];

export default function BatalhaColetivaPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const d = await apiFetch<DashboardResponse>('/me/dashboard');
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.code === 'NETWORK_ERROR') {
            setErro('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
          } else {
            setErro('Não foi possível carregar o lobby. Tente recarregar a página.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1500);
  };

  if (erro) {
    return (
      <Pagina>
        <Voltar />
        <Notice tone="danger" title="Não foi possível abrir o lobby">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!data) return <LobbySkeleton />;

  const { perfil, nivel } = data;

  return (
    <Pagina largura="media">
      <div className="flex flex-col gap-space-3">
        <Voltar />
        <PageHeader
          title="Batalha coletiva"
          status={<Chip tone="danger">Ao vivo</Chip>}
          description="Represente sua instituição no duelo nacional."
          actions={
            <p className="m-0 text-right">
              <span className="block text-caption text-ink-muted">Seu perfil</span>
              <span className="text-body font-bold text-ink">
                {perfil.nome || 'Estudante'} · nível {nivel.atual}
              </span>
            </p>
          }
        />
      </div>

      <Panel>
        <div className="flex min-h-[200px] flex-col items-start justify-center gap-space-5">
          {connected ? (
            <>
              <CircleCheck aria-hidden="true" className="h-10 w-10 text-success" />
              <div className="flex flex-col gap-space-2">
                <h2 className="m-0 font-display text-heading-2 text-ink">Conectado ao servidor</h2>
                <p role="status" className="m-0 text-body text-ink-muted">
                  Aguardando o host (professor) iniciar a partida…
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-space-2">
                <h2 className="m-0 font-display text-heading-2 text-ink">Sessão: Grande Duelo de Exatas</h2>
                <p className="m-0 text-body text-ink-muted">Sexta-feira, 15h00. O servidor está aceitando conexões.</p>
              </div>
              <Button onClick={handleConnect} loading={connecting}>
                {connecting ? 'Conectando' : 'Entrar na batalha'}
              </Button>
            </>
          )}
        </div>
      </Panel>

      <Section title="Como funciona a batalha" divided>
        <ul className="m-0 grid list-none grid-cols-1 gap-space-5 p-0 sm:grid-cols-3">
          <li className="flex flex-col gap-space-2">
            <Clock aria-hidden="true" className="h-5 w-5 text-primary" />
            <h3 className="m-0 text-body font-bold text-ink">Tempo limitado</h3>
            <p className="m-0 text-body-sm text-ink-muted">Responda o mais rápido possível para ganhar bônus de XP.</p>
          </li>
          <li className="flex flex-col gap-space-2">
            <Flame aria-hidden="true" className="h-5 w-5 text-primary" />
            <h3 className="m-0 text-body font-bold text-ink">Combos</h3>
            <p className="m-0 text-body-sm text-ink-muted">Acertos consecutivos multiplicam a sua pontuação global.</p>
          </li>
          <li className="flex flex-col gap-space-2">
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary" />
            <h3 className="m-0 text-body font-bold text-ink">Pódio da instituição</h3>
            <p className="m-0 text-body-sm text-ink-muted">Os 3 melhores ganham insígnias exclusivas no perfil.</p>
          </li>
        </ul>
      </Section>

      <Section
        title="Jogadores no lobby"
        action={<Chip tone="neutral">{connected ? MOCK_PLAYERS.length + 1 : MOCK_PLAYERS.length} online</Chip>}
        divided
      >
        <ul className="m-0 flex list-none flex-col p-0">
          {connected && (
            <li className="flex items-center justify-between gap-space-4 border-b border-line py-space-3">
              <span>
                <span className="block text-body font-bold text-primary">{perfil.nome || 'Você'}</span>
                <span className="block text-caption text-ink-muted">Sua instituição</span>
              </span>
              <span className="text-label tabular-nums text-primary">Nível {nivel.atual}</span>
            </li>
          )}
          {MOCK_PLAYERS.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-space-4 border-b border-line py-space-3 last:border-b-0">
              <span>
                <span className="block text-body font-bold text-ink">{p.nome}</span>
                <span className="block text-caption text-ink-muted">{p.instituicao}</span>
              </span>
              <span className="text-label tabular-nums text-ink-muted">Nível {p.nivel}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-caption text-ink-muted">Mais jogadores conectando…</p>
      </Section>
    </Pagina>
  );
}

function LobbySkeleton() {
  return (
    <Pagina>
      <Carregando rotulo="Carregando o lobby" className="flex flex-col gap-space-6 md:gap-space-7">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </Carregando>
    </Pagina>
  );
}
