'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CircleHelp, LogOut } from 'lucide-react';
import {
  AppFrame,
  BottomNav,
  CommandPalette,
  Menu,
  NotaASimbolo,
  ShortcutsDialog,
  SideNav,
  TopBar,
  useAtalhos,
  type ComandoItem,
  type GrupoDeAtalhos,
  type MenuItem,
} from '@notaa/ui';
import { NAV_RECOLHIDA_STORAGE_KEY } from '../../lib/storage-keys';
import { AvisoOffline } from './AvisoOffline';

export interface ItemDeNavegacao {
  href: string;
  rotulo: string;
  /** Ícone de 20px. Aparece sozinho entre 768 e 1.023px e na navegação inferior. */
  icone: ReactNode;
}

const ATALHOS: GrupoDeAtalhos[] = [
  {
    titulo: 'Geral',
    itens: [
      { teclas: ['Ctrl/⌘', 'K'], descricao: 'Buscar telas e ações' },
      { teclas: ['/'], descricao: 'Buscar telas e ações' },
      { teclas: ['?'], descricao: 'Abrir esta lista de atalhos' },
      { teclas: ['['], descricao: 'Recolher ou expandir o menu lateral' },
      { teclas: ['Esc'], descricao: 'Fechar painéis e diálogos' },
    ],
  },
  {
    titulo: 'Tabelas',
    itens: [
      { teclas: ['↑', '↓'], descricao: 'Mover a linha em foco' },
      { teclas: ['Home', 'End'], descricao: 'Ir à primeira ou à última linha' },
      { teclas: ['Enter'], descricao: 'Abrir a linha em foco' },
      { teclas: ['Espaço'], descricao: 'Marcar ou desmarcar a linha em foco' },
    ],
  },
];

/**
 * Moldura de aplicativo para todos os perfis: SideNav fixa e recolhível, barra superior com busca
 * (Ctrl/Cmd+K), contexto, atalhos e conta, e só a área de trabalho rola. Abaixo de 768px a navegação
 * é a inferior; entre 768 e 1.023px a SideNav mostra só ícones.
 */
export function ShellDesktop({
  itens,
  rotuloDaNavegacao,
  contexto,
  acoes,
  comandos = [],
  nomeDaConta,
  emailDaConta,
  itensDaConta = [],
  aoSair,
  children,
}: {
  itens: readonly ItemDeNavegacao[];
  rotuloDaNavegacao: string;
  /** Seletor de contexto (ano, turma) na barra superior. */
  contexto?: ReactNode;
  /** Indicadores ou ações à direita, antes da conta. */
  acoes?: ReactNode;
  comandos?: ComandoItem[];
  nomeDaConta?: string | null;
  emailDaConta?: string | null;
  itensDaConta?: MenuItem[];
  aoSair: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [atalhosAbertos, setAtalhosAbertos] = useState(false);
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    try {
      setRecolhida(localStorage.getItem(NAV_RECOLHIDA_STORAGE_KEY) === '1');
    } catch {
      // Sem armazenamento a barra começa expandida.
    }
  }, []);

  const alternarRecolhida = useCallback(() => {
    setRecolhida((atual) => {
      try {
        if (atual) localStorage.removeItem(NAV_RECOLHIDA_STORAGE_KEY);
        else localStorage.setItem(NAV_RECOLHIDA_STORAGE_KEY, '1');
      } catch {
        // Sem armazenamento a escolha vale só nesta visita.
      }
      return !atual;
    });
  }, []);

  useAtalhos([
    { tecla: 'k', mod: true, aoAcionar: () => setBuscaAberta(true) },
    { tecla: '/', aoAcionar: () => setBuscaAberta(true) },
    { tecla: '?', aoAcionar: () => setAtalhosAbertos(true) },
    { tecla: '[', aoAcionar: alternarRecolhida },
  ]);

  // A raiz do painel só fica ativa nela mesma; as demais, em subpáginas também.
  const raiz = itens[0]?.href;
  const atual = itens.find((item) => (item.href === raiz ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)))?.href;
  const itensDaNav = useMemo(() => itens.map((i) => ({ id: i.href, label: i.rotulo, href: i.href, icon: i.icone })), [itens]);

  const todosOsComandos = useMemo<ComandoItem[]>(
    () => [
      ...itens.map((i) => ({ id: `ir-${i.href}`, rotulo: i.rotulo, grupo: 'Ir para', icone: i.icone, aoSelecionar: () => router.push(i.href) })),
      ...comandos,
      { id: 'atalhos', rotulo: 'Atalhos de teclado', grupo: 'Ajuda', dica: '?', icone: <CircleHelp className="h-5 w-5" />, aoSelecionar: () => setAtalhosAbertos(true) },
      { id: 'sair', rotulo: 'Sair da conta', grupo: 'Conta', icone: <LogOut className="h-5 w-5" />, aoSelecionar: aoSair },
    ],
    [itens, comandos, router, aoSair],
  );

  const inicial = (nomeDaConta ?? emailDaConta ?? 'N').trim().charAt(0).toUpperCase();

  return (
    <>
      <AppFrame
        nav={
          <SideNav
            items={itensDaNav}
            current={atual}
            label={rotuloDaNavegacao}
            logo={<NotaASimbolo className="h-6 w-auto flex-none" />}
            linkAs={Link}
            collapsible
            recolhida={recolhida}
            onRecolher={alternarRecolhida}
            className="h-full"
          />
        }
        topbar={
          <TopBar
            esquerda={
              <>
                <Link href={itens[0]?.href ?? '/'} aria-label="Nota A, ir para o início" className="flex items-center rounded-md md:hidden">
                  <NotaASimbolo className="h-6 w-auto" />
                </Link>
                {contexto}
              </>
            }
            aoBuscar={() => setBuscaAberta(true)}
            acoes={
              <>
                {acoes}
                <button
                  type="button"
                  onClick={() => setAtalhosAbertos(true)}
                  aria-label="Atalhos de teclado"
                  title="Atalhos de teclado (?)"
                  className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-ink-muted transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:inline-flex"
                >
                  <CircleHelp aria-hidden="true" className="h-5 w-5" />
                </button>
              </>
            }
            conta={
              <Menu
                label={
                  <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-pill bg-violet-tint font-display text-label text-primary">
                    {inicial}
                  </span>
                }
                ariaLabel={`Conta${nomeDaConta ? ` de ${nomeDaConta}` : ''}`}
                variant="quiet"
                align="end"
                className="[&_button]:px-space-2"
                items={[
                  ...itensDaConta,
                  { id: 'atalhos', label: 'Atalhos de teclado', onSelect: () => setAtalhosAbertos(true) },
                  { id: 'sair', label: 'Sair', tone: 'danger', onSelect: aoSair },
                ]}
              />
            }
          />
        }
        bottomNav={<BottomNav items={itensDaNav.slice(0, 5).map((i) => ({ id: i.id, label: i.label, href: i.href, icon: i.icon }))} current={atual} label={rotuloDaNavegacao} linkAs={Link} />}
      >
        <AvisoOffline className="px-4 pt-space-4 lg:px-space-6" />
        {children}
      </AppFrame>
      <CommandPalette open={buscaAberta} onClose={() => setBuscaAberta(false)} itens={todosOsComandos} />
      <ShortcutsDialog open={atalhosAbertos} onClose={() => setAtalhosAbertos(false)} grupos={ATALHOS} />
    </>
  );
}
