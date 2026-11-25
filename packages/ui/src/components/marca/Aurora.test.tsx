import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { Aurora } from './Aurora';

describe('Aurora', () => {
  it('mostra o conteúdo por cima e esconde as formas do leitor de tela', () => {
    const { container } = render(
      <Aurora>
        <h1>Sua nota começa hoje</h1>
      </Aurora>,
    );
    expect(screen.getByRole('heading', { name: 'Sua nota começa hoje' })).toBeInTheDocument();
    const formas = container.querySelectorAll('span[aria-hidden="true"]');
    expect(formas).toHaveLength(3);
  });

  it('renderiza o elemento pedido em `as`', () => {
    const { container } = render(<Aurora as="section">x</Aurora>);
    expect(container.firstElementChild?.tagName).toBe('SECTION');
  });

  it('todas as formas animadas respeitam prefers-reduced-motion', () => {
    const { container } = render(<Aurora>x</Aurora>);
    for (const forma of container.querySelectorAll('span[aria-hidden="true"]')) {
      expect(forma.className).toContain('motion-reduce:animate-none');
    }
  });

  it('usa ease-in-out (e não ease-out) no movimento', () => {
    const { container } = render(<Aurora>x</Aurora>);
    for (const forma of container.querySelectorAll('span[aria-hidden="true"]')) {
      expect(forma.className).toContain('var(--ease-in-out)');
    }
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <Aurora>
        <p>Texto</p>
      </Aurora>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
