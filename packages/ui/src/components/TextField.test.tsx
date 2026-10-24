import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

describe('TextField', () => {
  it('liga o rótulo ao campo', () => {
    render(<TextField label="Peso da avaliação" />);
    expect(screen.getByLabelText('Peso da avaliação')).toBeInTheDocument();
  });

  it('liga a dica ao campo por aria-describedby, sem marcar inválido', () => {
    render(<TextField label="Peso" hint="De 1 a 10." />);
    const campo = screen.getByLabelText('Peso');
    expect(campo).toHaveAccessibleDescription('De 1 a 10.');
    expect(campo).not.toHaveAttribute('aria-invalid');
  });

  it('o erro substitui a dica, marca aria-invalid e fica na descrição', () => {
    render(<TextField label="Peso" hint="De 1 a 10." error="O peso precisa ficar entre 1 e 10." />);
    const campo = screen.getByLabelText('Peso');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('O peso precisa ficar entre 1 e 10.');
    expect(screen.queryByText('De 1 a 10.')).not.toBeInTheDocument();
  });

  it('preserva um aria-describedby vindo de fora junto com o do erro', () => {
    render(
      <>
        <p id="extra">Veja a regra.</p>
        <TextField label="Peso" error="Valor inválido." aria-describedby="extra" />
      </>,
    );
    expect(screen.getByLabelText('Peso')).toHaveAccessibleDescription('Veja a regra. Valor inválido.');
  });

  it('aceita digitação e dispara onChange', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<TextField label="Nome" onChange={aoMudar} />);
    await user.type(screen.getByLabelText('Nome'), 'Ana');
    expect(aoMudar).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana');
  });

  it('desabilitado não recebe foco por Tab', async () => {
    const user = userEvent.setup();
    render(<TextField label="Nome" disabled />);
    await user.tab();
    expect(screen.getByLabelText('Nome')).not.toHaveFocus();
  });

  it('o anel de foco também aparece quando o foco está num campo interno (type=date)', () => {
    render(<TextField label="Início" type="date" />);
    expect(screen.getByLabelText('Início').className).toContain('focus-within:outline-2');
  });

  it('tem alvo de 44px', () => {
    render(<TextField label="Nome" />);
    expect(screen.getByLabelText('Nome').className).toContain('min-h-[44px]');
  });

  it('não tem violações de acessibilidade, nem com erro', async () => {
    const { container } = render(
      <>
        <TextField label="Nome" hint="Como aparece no boletim." />
        <TextField label="Peso" error="O peso precisa ficar entre 1 e 10." />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
