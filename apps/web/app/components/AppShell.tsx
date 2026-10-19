'use client';
import type { ReactNode } from 'react';
import { BookOpen, Compass, Flame, House, School, Target, User } from 'lucide-react';
import { Chip } from '@notaa/ui';
import { FEATURES } from '../../lib/feature-flags';
import { useAuth } from '../../lib/auth-context';
import { useUser } from '../../lib/user-context';
import { ShellDesktop, type ItemDeNavegacao } from './ShellDesktop';

const ICONE = 'h-5 w-5';

/**
 * Destinos de navegação do aluno e da família.
 *
 * Quem enxerga o Painel da Instituição é o PAPEL, não o plano contratado.
 * `Papel` (contracts/common.ts) não tem o valor 'instituicao': quem se cadastra
 * representando uma vira 'admin_instituicao' (auth.service.ts, paraPapel), então
 * o teste antigo comparava com um valor inexistente e escondia a aba de quem é
 * dono dela. O plano também não serve de critério — um estudante coberto por uma
 * licença institucional tem plano 'instituicao' e não pode ver dado de colega.
 *
 * No computador a SideNav mostra todos os destinos. Abaixo de 768px a navegação inferior comporta
 * 5: o Painel da Instituição é o único que pode ficar de fora, e fica na SideNav e na paleta (Ctrl/Cmd+K).
 */
function destinosDoAluno(isAdminInstituicao: boolean): ItemDeNavegacao[] {
  return [
    { href: '/dashboard', rotulo: 'Início', icone: <House className={ICONE} /> },
    { href: '/trilhas', rotulo: 'Trilha', icone: <Compass className={ICONE} /> },
    { href: '/estudo', rotulo: 'Estudo', icone: <BookOpen className={ICONE} /> },
    // Arena oculta enquanto FEATURES.arena estiver desligada (lib/feature-flags.ts).
    ...(FEATURES.arena ? [{ href: '/arena', rotulo: 'Arena', icone: <Target className={ICONE} /> }] : []),
    { href: '/perfil', rotulo: 'Perfil', icone: <User className={ICONE} /> },
    ...(isAdminInstituicao ? [{ href: '/instituicao', rotulo: 'Instituição', icone: <School className={ICONE} /> }] : []),
  ];
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, perfil, xp, level, streak, loading } = useUser();
  const { signOut } = useAuth();
  const isAdminInstituicao = role === 'admin_instituicao' || role === 'admin';

  return (
    <ShellDesktop
      itens={destinosDoAluno(isAdminInstituicao)}
      rotuloDaNavegacao="Navegação principal"
      nomeDaConta={perfil?.nome}
      emailDaConta={perfil?.email}
      aoSair={() => void signOut()}
      acoes={
        loading ? null : (
          <>
            <span title={`XP total: ${xp}`}>
              <Chip tone="neutral">Nível {level}</Chip>
            </span>
            <Chip tone="neutral">
              <Flame aria-hidden="true" className="h-3.5 w-3.5" />
              {streak} {streak === 1 ? 'dia' : 'dias'}
            </Chip>
          </>
        )
      }
    >
      {children}
    </ShellDesktop>
  );
}
