import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const opcoes = [
  { value: 'tri', label: 'Trimestral' },
  { value: 'bim', label: 'Bimestral' },
];

describe('Select', () => {
  it('liga o rótulo e lista as opções', () => {
    render(<Select label="Período" options={opcoes} />);
    expect(screen.getByRole('combobox', { name: 'Período' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('recebe foco por Tab e dispara onChange ao escolher', async () => {
    // jsdom não implementa a seta sobre <select> nativo; o teclado real é do navegador.
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Select label="Período" options={opcoes} onChange={aoMudar} />);
    await user.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
    await user.selectOptions(screen.getByRole('combobox'), 'bim');
    expect(aoMudar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox')).toHaveValue('bim');
  });

  it('o erro marca aria-invalid e vira a descrição', () => {
    render(<Select label="Período" options={opcoes} hint="Escolha um." error="Escolha o período." />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Escolha o período.');
  });

  it('a dica descreve o campo quando não há erro', () => {
    render(<Select label="Período" options={opcoes} hint="Define as notas." />);
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Define as notas.');
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-invalid');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<Select label="Período" options={opcoes} error="Escolha o período." />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
