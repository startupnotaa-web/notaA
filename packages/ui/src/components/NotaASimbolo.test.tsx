import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { NotaASimbolo } from './NotaASimbolo';

describe('NotaASimbolo', () => {
  it('é decorativo por padrão (o nome "Nota A" vem do texto ao lado)', () => {
    const { container } = render(<NotaASimbolo />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('com titulo vira uma imagem com nome acessível', () => {
    render(<NotaASimbolo titulo="Nota A" />);
    expect(screen.getByRole('img', { name: 'Nota A' })).toBeInTheDocument();
  });

  it('duas instâncias não repartem o id do gradiente', () => {
    const { container } = render(
      <>
        <NotaASimbolo />
        <NotaASimbolo />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('linearGradient')).map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const svg of container.querySelectorAll('svg')) {
      const id = svg.querySelector('linearGradient')!.id;
      expect(svg.querySelector('path[fill-rule]')).toHaveAttribute('fill', `url(#${id})`);
    }
  });

  it('as cores vêm das variáveis de marca, sem hexadecimal', () => {
    const { container } = render(<NotaASimbolo />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![^<]*\))/);
    expect(container.innerHTML).toContain('var(--brand-cyan)');
    expect(container.innerHTML).toContain('var(--brand-violet)');
    expect(container.innerHTML).toContain('var(--brand-magenta)');
    expect(container.innerHTML).toContain('var(--brand-blue)');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<NotaASimbolo titulo="Nota A" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
