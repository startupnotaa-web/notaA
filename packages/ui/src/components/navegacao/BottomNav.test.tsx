import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomNav, type BottomNavItem } from './BottomNav';

const item = (id: string): BottomNavItem => ({ id, label: id, href: `/${id}`, icon: <svg /> });
const cinco = ['inicio', 'trilha', 'estudo', 'arena', 'perfil'].map(item);

describe('BottomNav', () => {
  afterEach(() => vi.restoreAllMocks());

  it('é um nav nomeado, com rótulo visível em cada destino', () => {
    render(<BottomNav items={cinco} label="Navegação principal" />);
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'trilha' })).toBeVisible();
  });

  it('marca só o destino atual', () => {
    render(<BottomNav items={cinco} current="estudo" />);
    expect(screen.getByRole('link', { name: 'estudo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'trilha' })).not.toHaveAttribute('aria-current');
  });

  it('cada destino tem alvo de pelo menos 44px', () => {
    render(<BottomNav items={cinco} />);
    for (const link of screen.getAllByRole('link')) expect(link.className).toContain('min-h-[56px]');
  });

  it('percorre os destinos por Tab', async () => {
    const user = userEvent.setup();
    render(<BottomNav items={cinco} />);
    await user.tab();
    expect(screen.getByRole('link', { name: 'inicio' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'trilha' })).toHaveFocus();
  });

  it('com mais de 5 destinos mostra 5 e avisa em desenvolvimento', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<BottomNav items={[...cinco, item('extra')]} />);
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(erro).toHaveBeenCalled();
  });

  it('usa o componente de link informado', () => {
    const Meu = ({ href, ...p }: { href: string; className?: string; children: React.ReactNode }) => <a data-meu href={href} {...p} />;
    render(<BottomNav items={cinco} linkAs={Meu} />);
    expect(screen.getByRole('link', { name: 'inicio' })).toHaveAttribute('data-meu');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<BottomNav items={cinco} current="inicio" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
