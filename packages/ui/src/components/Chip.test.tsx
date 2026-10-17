import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';
import { ChoiceChip } from './ChoiceChip';

describe('Chip', () => {
  it('mostra a palavra do estado', () => {
    render(<Chip tone="danger">Reprovado</Chip>);
    expect(screen.getByText('Reprovado')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)('o tom %s leva ícone além da cor', (tone) => {
    const { container } = render(<Chip tone={tone}>Estado</Chip>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(['neutral', 'brand'] as const)('o tom %s não precisa de ícone', (tone) => {
    const { container } = render(<Chip tone={tone}>Rótulo</Chip>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('não é interativo', () => {
    render(<Chip tone="success">Aprovado</Chip>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('não tem violações de acessibilidade em todos os tons', async () => {
    const { container } = render(
      <>
        {(['neutral', 'brand', 'info', 'success', 'warning', 'danger'] as const).map((t) => (
          <Chip key={t} tone={t}>
            {t}
          </Chip>
        ))}
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ChoiceChip', () => {
  it('expõe o estado por aria-pressed e alterna com Enter e Espaço', async () => {
    const user = userEvent.setup();
    const aoClicar = vi.fn();
    render(<ChoiceChip selected onClick={aoClicar}>Biologia</ChoiceChip>);
    const chip = screen.getByRole('button', { name: 'Biologia' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(aoClicar).toHaveBeenCalledTimes(2);
  });

  it('sem seleção marca aria-pressed="false"', () => {
    render(<ChoiceChip>Física</ChoiceChip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });
});
