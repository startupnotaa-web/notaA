import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { SideNav, type SideNavProps } from './SideNav';

const itens: SideNavProps['items'] = [
  { group: 'Gestão' },
  { id: 'painel', label: 'Painel', href: '/painel', icon: <svg data-testid="i1" /> },
  { id: 'notas', label: 'Notas', href: '/notas', badge: '3', icon: <svg /> },
];

describe('SideNav', () => {
  it('é um nav nomeado com a marca e os grupos', () => {
    render(<SideNav items={itens} label="Painel da instituição" />);
    expect(screen.getByRole('navigation', { name: 'Painel da instituição' })).toBeInTheDocument();
    expect(screen.getByText('Nota A')).toBeInTheDocument();
    expect(screen.getByText('Gestão')).toBeInTheDocument();
  });

  it('marca só o item atual com aria-current="page"', () => {
    render(<SideNav items={itens} current="notas" />);
    expect(screen.getByRole('link', { name: /Notas/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Painel' })).not.toHaveAttribute('aria-current');
  });

  it('mostra o distintivo junto do rótulo', () => {
    render(<SideNav items={itens} />);
    expect(screen.getByRole('link', { name: /Notas.*3/ })).toBeInTheDocument();
  });

  it('percorre os links por Tab, na ordem', async () => {
    const user = userEvent.setup();
    render(<SideNav items={itens} />);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: /Notas/ })).toHaveFocus();
  });

  it('recolhido mantém o nome acessível de cada item (texto fica para leitor de tela)', () => {
    render(<SideNav items={itens} collapsible />);
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('title', 'Painel');
    expect(screen.getByText('Painel')).toHaveClass('max-lg:sr-only');
  });

  it('mostra o rodapé abaixo dos itens, separado por uma linha fina', () => {
    render(<SideNav items={itens} footer={<button type="button">Sair</button>} />);
    const botao = screen.getByRole('button', { name: 'Sair' });
    expect(botao.parentElement).toHaveClass('mt-auto', 'border-t', 'border-line');
    expect(screen.getByRole('navigation')).toContainElement(botao);
  });

  it('usa o componente de link informado', () => {
    const Meu = ({ href, ...p }: { href: string; className?: string; children: React.ReactNode }) => (
      <a data-meu href={href} {...p} />
    );
    render(<SideNav items={itens} linkAs={Meu} />);
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('data-meu');
  });

  it('aceita o símbolo como URL (img decorativa) ou como elemento', () => {
    const { container, rerender } = render(<SideNav items={itens} logo="/s.svg" />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    rerender(<SideNav items={itens} logo={<svg data-testid="marca" />} />);
    expect(screen.getByTestId('marca')).toBeInTheDocument();
  });

  it('cada item tem alvo de 44px', () => {
    render(<SideNav items={itens} />);
    expect(screen.getByRole('link', { name: 'Painel' }).className).toContain('min-h-[44px]');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<SideNav items={itens} current="painel" collapsible />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
