import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItem } from './Menu';

const montar = (extra: Partial<MenuItem>[] = []) => {
  const aoExportar = vi.fn();
  const aoArquivar = vi.fn();
  const aoExcluir = vi.fn();
  const itens: MenuItem[] = [
    { id: 'exportar', label: 'Exportar notas', onSelect: aoExportar },
    { id: 'arquivar', label: 'Arquivar turma', onSelect: aoArquivar, ...extra[0] },
    { id: 'excluir', label: 'Excluir turma', onSelect: aoExcluir, tone: 'danger' },
  ];
  render(<Menu label="Ações da turma" items={itens} />);
  return { aoExportar, aoArquivar, aoExcluir };
};

describe('Menu', () => {
  it('o botão anuncia que abre um menu e está recolhido', () => {
    montar();
    const botao = screen.getByRole('button', { name: 'Ações da turma' });
    expect(botao).toHaveAttribute('aria-haspopup', 'menu');
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('clicar abre, marca aria-expanded e foca o primeiro item', async () => {
    const user = userEvent.setup();
    montar();
    const botao = screen.getByRole('button', { name: 'Ações da turma' });
    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Ações da turma' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByRole('menuitem', { name: 'Exportar notas' })).toHaveFocus();
  });

  it('seta para baixo no botão abre no primeiro item e seta para cima, no último', async () => {
    const user = userEvent.setup();
    montar();
    screen.getByRole('button', { name: 'Ações da turma' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Exportar notas' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Excluir turma' })).toHaveFocus();
  });

  it('as setas percorrem os itens e dão a volta', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Arquivar turma' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Exportar notas' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Excluir turma' })).toHaveFocus();
  });

  it('Home e End vão ao primeiro e ao último item', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Excluir turma' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Exportar notas' })).toHaveFocus();
  });

  it('digitar a inicial salta para o item que começa com ela', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    await user.keyboard('e');
    await user.keyboard('x');
    await user.keyboard('c');
    expect(screen.getByRole('menuitem', { name: 'Excluir turma' })).toHaveFocus();
  });

  it('item desabilitado é pulado pelas setas', async () => {
    const user = userEvent.setup();
    montar([{ disabled: true }]);
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Excluir turma' })).toHaveFocus();
  });

  it('Esc fecha e devolve o foco ao botão', async () => {
    const user = userEvent.setup();
    montar();
    const botao = screen.getByRole('button', { name: 'Ações da turma' });
    await user.click(botao);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });

  it('Enter no item executa a ação, fecha e devolve o foco', async () => {
    const user = userEvent.setup();
    const { aoArquivar } = montar();
    const botao = screen.getByRole('button', { name: 'Ações da turma' });
    await user.click(botao);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(aoArquivar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });

  it('clicar fora fecha sem executar nada', async () => {
    const user = userEvent.setup();
    const { aoExportar } = montar();
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(aoExportar).not.toHaveBeenCalled();
  });

  it('Tab fecha o menu', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    await user.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ação destrutiva vai em danger e os itens têm alvo de 44px', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    const excluir = screen.getByRole('menuitem', { name: 'Excluir turma' });
    expect(excluir.className).toContain('text-danger');
    expect(excluir.className).toContain('min-h-[44px]');
  });

  it('flutua com a sombra de flutuação e abre em 240ms', async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole('button', { name: 'Ações da turma' }));
    const classes = screen.getByRole('menu').className;
    expect(classes).toContain('shadow-raise');
    expect(classes).toContain('240ms');
    expect(classes).toContain('motion-reduce:animate-none');
  });

  it('com label só de ícone usa ariaLabel como nome', () => {
    render(<Menu label={<svg aria-hidden="true" />} ariaLabel="Mais ações" items={[{ id: 'a', label: 'A', onSelect: () => {} }]} />);
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeInTheDocument();
  });

  it('não tem violações de acessibilidade, aberto', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Menu label="Ações" items={[{ id: 'a', label: 'Exportar', onSelect: () => {} }, { id: 'b', label: 'Excluir', onSelect: () => {}, tone: 'danger' }]} />,
    );
    await user.click(screen.getByRole('button', { name: 'Ações' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
