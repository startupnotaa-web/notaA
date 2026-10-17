import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, propsDoPainel } from './Tabs';

const abas = [
  { id: 'alunos', label: 'Alunos', count: 32 },
  { id: 'notas', label: 'Notas' },
  { id: 'faltas', label: 'Faltas' },
];

describe('Tabs', () => {
  it('tem tablist nomeado e a primeira aba selecionada', () => {
    render(<Tabs tabs={abas} label="Seções da turma" />);
    expect(screen.getByRole('tablist', { name: 'Seções da turma' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Alunos/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveAttribute('aria-selected', 'false');
  });

  it('só a aba ativa entra na ordem de Tab (roving tabindex)', () => {
    render(<Tabs tabs={abas} label="Seções" defaultValue="notas" />);
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Alunos/ })).toHaveAttribute('tabindex', '-1');
  });

  it('setas movem seleção E foco, e dão a volta nas pontas', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Tabs tabs={abas} label="Seções" onChange={aoMudar} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Notas' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Alunos/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Faltas' })).toHaveFocus();
    expect(aoMudar).toHaveBeenLastCalledWith('faltas');
  });

  it('Home e End vão para a primeira e a última aba', async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={abas} label="Seções" defaultValue="notas" />);
    screen.getByRole('tab', { name: 'Notas' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Faltas' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /Alunos/ })).toHaveFocus();
  });

  it('modo controlado segue o value e não troca sozinho', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Tabs tabs={abas} label="Seções" value="alunos" onChange={aoMudar} />);
    await user.click(screen.getByRole('tab', { name: 'Notas' }));
    expect(aoMudar).toHaveBeenCalledWith('notas');
    expect(screen.getByRole('tab', { name: /Alunos/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('com idBase liga a aba ao painel', () => {
    render(
      <>
        <Tabs tabs={abas} label="Seções" idBase="t" />
        <div {...propsDoPainel('t', 'alunos')}>Lista</div>
      </>,
    );
    const aba = screen.getByRole('tab', { name: /Alunos/ });
    const painel = screen.getByRole('tabpanel');
    expect(aba).toHaveAttribute('aria-controls', painel.id);
    expect(painel).toHaveAccessibleName(/Alunos/);
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <>
        <Tabs tabs={abas} label="Seções" idBase="t" />
        <div {...propsDoPainel('t', 'alunos')}>Lista</div>
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
