import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { ProgressTrail } from './ProgressTrail';

describe('ProgressTrail', () => {
  it('é uma barra de progresso nomeada com valores e texto', () => {
    render(<ProgressTrail total={4} done={2} label="Importação" caption="Passo 3 de 4" />);
    const barra = screen.getByRole('progressbar', { name: 'Importação' });
    expect(barra).toHaveAttribute('aria-valuemin', '0');
    expect(barra).toHaveAttribute('aria-valuemax', '4');
    expect(barra).toHaveAttribute('aria-valuenow', '2');
    expect(barra).toHaveAttribute('aria-valuetext', '2 de 4');
    expect(screen.getByText('Passo 3 de 4')).toBeInTheDocument();
  });

  it('limita done ao intervalo 0..total', () => {
    const { rerender } = render(<ProgressTrail total={3} done={9} label="P" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    rerender(<ProgressTrail total={3} done={-2} label="P" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('desenha um losango por etapa e um elo entre elas', () => {
    const { container } = render(<ProgressTrail total={4} done={1} label="P" />);
    expect(container.querySelectorAll('span.rotate-45')).toHaveLength(4);
    expect(container.querySelectorAll('span.h-0\\.5')).toHaveLength(3);
  });

  it('o avanço usa a duração lenta (420ms)', () => {
    const { container } = render(<ProgressTrail total={2} done={1} label="P" />);
    expect(container.querySelector('span.rotate-45')?.className).toContain('duration-slow');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<ProgressTrail total={4} done={2} label="Importação" caption="Passo 3 de 4" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
