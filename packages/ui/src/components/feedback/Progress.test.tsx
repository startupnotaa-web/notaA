import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress';

describe('Progress', () => {
  it('expõe valor, mínimo e máximo', () => {
    render(<Progress value={30} max={60} label="Questões" />);
    const barra = screen.getByRole('progressbar', { name: 'Questões' });
    expect(barra).toHaveAttribute('aria-valuenow', '30');
    expect(barra).toHaveAttribute('aria-valuemax', '60');
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('preenche sempre em primary: o gradiente é só do ProgressTrail, da Aurora e da marca', () => {
    const { container } = render(<Progress value={50} />);
    const html = container.innerHTML;
    expect(html).toContain('bg-primary');
    expect(html).not.toMatch(/gradient|brand-/);
  });

  it('limita o valor ao intervalo', () => {
    render(<Progress value={150} label="Meta" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<Progress value={40} label="Progresso" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
