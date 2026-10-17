'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Compass, Flame, House, School, Target, User } from 'lucide-react';
import { BottomNav, Chip, Menu, NotaASimbolo, ProgressTrail } from '@notaa/ui';
import { FEATURES } from '../../lib/feature-flags';
import { useUser } from '../../lib/user-context';

const ICONE = 'h-5 w-5';

/**
 * Destinos da navegação inferior do aluno e da família: mobile-first, no máximo 5.
 *
 * Quem enxerga o Painel da Instituição é o PAPEL, não o plano contratado.
 * `Papel` (contracts/common.ts) não tem o valor 'instituicao': quem se cadastra
 * representando uma vira 'admin_instituicao' (auth.service.ts, paraPapel), então
 * o teste antigo comparava com um valor inexistente e escondia a aba de quem é
 * dono dela. O plano também não serve de critério — um estudante coberto por uma
 * licença institucional tem plano 'instituicao' e não pode ver dado de colega.
 *
 * Com Arena ligada e papel de administrador seriam 6 destinos. Nesse caso o
 * Painel da Instituição sai da barra e vai para o menu "Mais", no cabeçalho.
 */
function destinosDoAluno(isAdminInstituicao: boolean) {
  const destinos = [
    { id: '/dashboard', href: '/dashboard', label: 'Início', icon: <House className={ICONE} /> },
    { id: '/trilhas', href: '/trilhas', label: 'Trilha', icon: <Compass className={ICONE} /> },
    { id: '/estudo', href: '/estudo', label: 'Estudo', icon: <BookOpen className={ICONE} /> },
    // Arena oculta enquanto FEATURES.arena estiver desligada (lib/feature-flags.ts).
    ...(FEATURES.arena ? [{ id: '/arena', href: '/arena', label: 'Arena', icon: <Target className={ICONE} /> }] : []),
    { id: '/perfil', href: '/perfil', label: 'Perfil', icon: <User className={ICONE} /> },
  ];
  const instituicao = { id: '/instituicao', href: '/instituicao', label: 'Instituição', icon: <School className={ICONE} /> };
  if (!isAdminInstituicao) return { destinos, noMenu: false };
  if (destinos.length < 5) return { destinos: [...destinos, instituicao], noMenu: false };
  return { destinos, noMenu: true };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useUser();
  const isAdminInstituicao = role === 'admin_instituicao' || role === 'admin';
  const { destinos, noMenu } = destinosDoAluno(isAdminInstituicao);
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:text-primary"
      >
        Pular para o conteúdo
      </a>
      <TopBar menuDaInstituicao={noMenu} />
      <main id="conteudo" className="flex-1 pb-20">
        {children}
      </main>
      <Navegacao destinos={destinos} />
    </div>
  );
}

function TopBar({ menuDaInstituicao }: { menuDaInstituicao: boolean }) {
  const { xp, level, streak, perfil, loading } = useUser();
  const router = useRouter();
  const isPremium = perfil?.plano && (perfil.plano.tipo === 'plus' || perfil.plano.tipo === 'instituicao');

  // Fração já conquistada dentro do nível atual, calculada pelo servidor (curva
  // única em gamificacao/nivel.ts). Substitui a régua antiga `xp % 100`, que não
  // correspondia à curva real de níveis.
  const progressoNivel = Math.min(Math.max(perfil?.gamificacao?.nivel.progresso ?? 0, 0), 1);
  const ETAPAS = 5;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          href="/dashboard"
          aria-label="Nota A, ir para o início"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md font-display text-[17px] font-semibold text-ink no-underline"
        >
          <NotaASimbolo className="h-6 w-auto" />
          Nota A
        </Link>
        <div className="flex items-center gap-2">
          {!loading && (
            <>
              <span title={`XP total: ${xp}`}>
                <Chip tone="neutral">Nível {level}</Chip>
              </span>
              <Chip tone="neutral">
                <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </Chip>
              <Chip tone={isPremium ? 'brand' : 'neutral'}>{isPremium ? 'Plano Pro' : 'Plano grátis'}</Chip>
            </>
          )}
          {menuDaInstituicao && (
            <Menu
              label="Mais"
              variant="quiet"
              align="end"
              items={[{ id: 'instituicao', label: 'Painel da instituição', onSelect: () => router.push('/instituicao') }]}
            />
          )}
        </div>
      </div>
      {!loading && (
        <div className="mx-auto w-full max-w-4xl px-4 pb-2.5">
          <ProgressTrail
            total={ETAPAS}
            done={Math.floor(progressoNivel * ETAPAS)}
            label="Progresso até o próximo nível"
            caption={`${Math.round(progressoNivel * 100)}% do nível ${level}`}
          />
        </div>
      )}
    </header>
  );
}

function Navegacao({ destinos }: { destinos: ReturnType<typeof destinosDoAluno>['destinos'] }) {
  const pathname = usePathname();
  const atual = destinos.find((d) => pathname === d.href || pathname.startsWith(d.href + '/'))?.id;
  return (
    <BottomNav
      items={destinos}
      current={atual}
      label="Navegação principal"
      linkAs={Link}
      innerClassName="max-w-4xl"
    />
  );
}
