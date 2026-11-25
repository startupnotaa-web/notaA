import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { AppFrame } from '../estrutura/AppFrame';
import { CommandPalette, type ComandoItem } from '../navegacao/CommandPalette';
import { Menu } from '../navegacao/Menu';
import { ShortcutsDialog } from '../navegacao/ShortcutsDialog';
import { SideNav } from '../navegacao/SideNav';
import { TopBar } from '../navegacao/TopBar';
import { useAtalhos } from '../../lib/atalhos';

describe('AppFrame', () => {
  it('ocupa a altura da tela e só a área de trabalho rola', () => {
    const { container } = render(
      <AppFrame nav={<nav aria-label="Principal">menu</nav>} topbar={<header>barra</header>}>
        conteúdo
      </AppFrame>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain('h-dvh');
    expect((container.firstElementChild as HTMLElement).className).toContain('overflow-hidden');
    const main = screen.getByRole('main');
    expect(main).toHaveClass('overflow-y-auto');
    expect(main).toHaveAttribute('id', 'conteudo');
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo');
  });

  it('com navegação inferior reserva espaço no fim da área de trabalho', () => {
    render(
      <AppFrame bottomNav={<nav aria-label="Inferior">x</nav>}>
        x
      </AppFrame>,
    );
    expect(screen.getByRole('main').className).toContain('pb-[72px]');
  });
});

describe('TopBar', () => {
  it('mostra o campo de busca e o atalho, e abre a paleta', async () => {
    const user = userEvent.setup();
    const aoBuscar = vi.fn();
    render(<TopBar aoBuscar={aoBuscar} esquerda={<span>Contexto</span>} conta={<button type="button">Conta</button>} />);
    const botao = screen.getByRole('button', { name: /Buscar telas e ações/ });
    expect(botao).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    await user.click(botao);
    expect(aoBuscar).toHaveBeenCalled();
    expect(screen.getByRole('banner')).toHaveClass('h-topbar');
  });
});

const itens: ComandoItem[] = [
  { id: 'painel', rotulo: 'Painel', grupo: 'Ir para', aoSelecionar: vi.fn() },
  { id: 'alunos', rotulo: 'Alunos', grupo: 'Ir para', aoSelecionar: vi.fn() },
  { id: 'importar', rotulo: 'Importar planilha', grupo: 'Ações', palavras: ['csv'], aoSelecionar: vi.fn() },
];

describe('CommandPalette', () => {
  it('abre com foco no campo e lista os itens agrupados', () => {
    render(<CommandPalette open onClose={() => {}} itens={itens} />);
    expect(screen.getByRole('combobox', { name: 'Buscar' })).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('Ir para')).toBeInTheDocument();
  });

  it('filtra sem acento e sem caixa, inclusive por palavras extras', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={() => {}} itens={itens} />);
    await user.type(screen.getByRole('combobox'), 'CSV');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Importar planilha/ })).toBeInTheDocument();
  });

  it('setas movem a opção ativa e Enter executa e fecha', async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    const alunos = vi.fn();
    render(
      <CommandPalette
        open
        onClose={aoFechar}
        itens={[
          { id: 'a', rotulo: 'Painel', aoSelecionar: vi.fn() },
          { id: 'b', rotulo: 'Alunos', aoSelecionar: alunos },
        ]}
      />,
    );
    const campo = screen.getByRole('combobox');
    expect(screen.getByRole('option', { name: 'Painel' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Alunos' })).toHaveAttribute('aria-selected', 'true');
    expect(campo).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Alunos' }).id);
    await user.keyboard('{Enter}');
    expect(alunos).toHaveBeenCalled();
    expect(aoFechar).toHaveBeenCalled();
  });

  it('Esc fecha e mostra mensagem quando nada é encontrado', async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    render(<CommandPalette open onClose={aoFechar} itens={itens} />);
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText(/Nada encontrado/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(aoFechar).toHaveBeenCalled();
  });

  it('não tem violações de acessibilidade', async () => {
    render(<CommandPalette open onClose={() => {}} itens={itens} />);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('ShortcutsDialog', () => {
  it('lista os atalhos agrupados, com teclas em kbd', () => {
    render(
      <ShortcutsDialog
        open
        onClose={() => {}}
        grupos={[{ titulo: 'Geral', itens: [{ teclas: ['Ctrl', 'K'], descricao: 'Abrir a busca' }] }]}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeInTheDocument();
    expect(screen.getByText('Abrir a busca')).toBeInTheDocument();
    expect(screen.getByText('K').tagName).toBe('KBD');
  });
});

describe('useAtalhos', () => {
  function Cena({ aoK, aoPonto }: { aoK: () => void; aoPonto: () => void }) {
    useAtalhos([
      { tecla: 'k', mod: true, aoAcionar: aoK },
      { tecla: '?', aoAcionar: aoPonto },
    ]);
    return <input aria-label="campo" />;
  }

  it('Ctrl+K dispara em qualquer lugar; ? só fora de campos de texto', async () => {
    const user = userEvent.setup();
    const aoK = vi.fn();
    const aoPonto = vi.fn();
    render(<Cena aoK={aoK} aoPonto={aoPonto} />);
    await user.keyboard('{Control>}k{/Control}');
    expect(aoK).toHaveBeenCalledTimes(1);
    await user.keyboard('?');
    expect(aoPonto).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText('campo'));
    await user.keyboard('?');
    expect(aoPonto).toHaveBeenCalledTimes(1);
    act(() => {});
  });
});

describe('SideNav recolhida e Menu marcável', () => {
  const itensNav = [{ id: 'a', label: 'Painel', href: '/a', icon: <svg /> }];

  it('recolhida deixa só ícones em qualquer largura e o botão alterna', async () => {
    const user = userEvent.setup();
    const aoRecolher = vi.fn();
    render(<SideNav items={itensNav} recolhida onRecolher={aoRecolher} />);
    expect(screen.getByRole('navigation').className).toContain('w-sidenav-recolhida');
    expect(screen.getByText('Painel')).toHaveClass('sr-only');
    await user.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(aoRecolher).toHaveBeenCalled();
  });

  it('item marcável do Menu vira menuitemradio com aria-checked', async () => {
    const user = userEvent.setup();
    render(
      <Menu
        label="Contexto"
        items={[
          { id: 'a', label: '2026', checked: true, onSelect: () => {} },
          { id: 'b', label: '2025', checked: false, onSelect: () => {} },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Contexto' }));
    expect(screen.getByRole('menuitemradio', { name: '2026' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: '2025' })).toHaveAttribute('aria-checked', 'false');
  });
});
