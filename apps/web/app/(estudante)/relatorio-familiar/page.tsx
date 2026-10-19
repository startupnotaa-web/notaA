'use client';
import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { DashboardResponse } from '@notaa/contracts';
import { Button, Carregando, Notice, PageHeader, Section, Skeleton, SummaryStrip } from '@notaa/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { Pagina } from '../../components/Pagina';
import { Voltar } from '../../components/Voltar';

const AREA_LABELS: Record<string, string> = {
  linguagens: 'Linguagens',
  matematica: 'Matemática',
  natureza: 'Natureza',
  humanas: 'Humanas',
};

export default function RelatorioFamiliarPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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
            setErro('Não foi possível carregar o relatório. Tente recarregar a página.');
          }
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Relatório familiar - Nota A',
        text: `Confira o progresso de ${data?.perfil.nome || 'nosso estudante'} na plataforma!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      window.print();
    }
  };

  if (erro) {
    return (
      <Pagina largura="estreita">
        <Voltar />
        <Notice tone="danger" title="Não foi possível abrir o relatório">
          {erro}
        </Notice>
      </Pagina>
    );
  }

  if (!data) return <RelatorioSkeleton />;

  const { perfil, streak, xpTotal, nivel, theta, progresso } = data;
  const atividadesExtras = progresso.redacoesEnviadas + progresso.sessoesSocraticas;
  const nomeAluno = perfil.nome || 'Estudante';

  // Encontrar o maior e o menor theta
  let melhorArea = '';
  let piorArea = '';
  let maxTheta = -Infinity;
  let minTheta = Infinity;

  Object.entries(theta).forEach(([key, info]) => {
    if (info.atual > maxTheta) {
      maxTheta = info.atual;
      melhorArea = key;
    }
    if (info.atual < minTheta) {
      minTheta = info.atual;
      piorArea = key;
    }
  });

  return (
    <Pagina largura="estreita">
      <div className="flex flex-col gap-space-3 print:hidden">
        <Voltar />
        <PageHeader
          title="Relatório familiar"
          description="Um resumo simples para compartilhar em casa."
          actions={
            <Button variant="secondary" onClick={handleShare}>
              <Share2 aria-hidden="true" className="h-5 w-5" />
              Compartilhar
            </Button>
          }
        />
      </div>

      {/* Documento compartilhável: sai limpo na impressão. */}
      <article id="relatorio-card" aria-label="Boletim de progresso" className="flex flex-col gap-space-6 md:gap-space-7">
        <header className="flex flex-col gap-space-1">
          <p className="m-0 text-label text-ink-muted">Boletim de progresso</p>
          <p className="m-0 font-display text-heading-1 text-ink">{nomeAluno}</p>
          <p className="m-0 text-body-sm text-ink-muted">Plataforma Nota A · {new Date().toLocaleDateString('pt-BR')}</p>
        </header>

        <SummaryStrip
          aria-label="Resumo do progresso"
          items={[
            { id: 'dias', label: 'Dias seguidos', value: streak.diasConsecutivos },
            { id: 'xp', label: 'XP acumulado', value: xpTotal.toLocaleString('pt-BR') },
            { id: 'nivel', label: 'Nível', value: nivel.atual },
          ]}
        />

        <Section title="Consistência" divided>
          <p className="m-0 max-w-texto text-body text-ink-muted">
            {nomeAluno} estudou por <strong className="text-ink">{streak.diasConsecutivos}</strong> dias seguidos. Manter
            um ritmo constante é o principal segredo para a aprovação.
          </p>
        </Section>

        <Section title="Onde está o foco" divided>
          <div className="grid gap-space-4 sm:grid-cols-2">
            <Notice tone="success" title="Maior domínio" className="max-w-none">
              O maior domínio atual é em <strong>{AREA_LABELS[melhorArea] || melhorArea}</strong>.
            </Notice>
            <Notice tone="warning" title="Área de crescimento" className="max-w-none">
              O sistema está recomendando mais treinos em <strong>{AREA_LABELS[piorArea] || piorArea}</strong>.
            </Notice>
          </div>
        </Section>

        <Section title="Além do básico" divided>
          <p className="m-0 max-w-texto text-body text-ink-muted">
            Além das questões normais, completou <strong className="text-ink">{atividadesExtras} atividades extras</strong>,
            entre redações enviadas e sessões com o tutor de IA.
          </p>
        </Section>

        <p className="m-0 border-t border-line pt-space-4 text-caption text-ink-muted">
          Este relatório é gerado automaticamente a partir do uso contínuo da plataforma.
        </p>
      </article>
    </Pagina>
  );
}

function RelatorioSkeleton() {
  return (
    <Pagina largura="estreita">
      <Carregando rotulo="Carregando o relatório" className="flex flex-col gap-space-6">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-11 w-32" />
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </Carregando>
    </Pagina>
  );
}
