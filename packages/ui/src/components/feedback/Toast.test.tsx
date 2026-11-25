import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster, dismiss, toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    act(() => {
      // esvazia o que sobrou entre testes
      for (let i = 1; i < 100; i++) dismiss(i);
    });
    vi.useRealTimers();
  });

  it('as regiões ao vivo existem antes de qualquer aviso', () => {
    render(<Toaster />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('informativo e sucesso entram na região role="status"', () => {
    render(<Toaster />);
    act(() => {
      toast('Disciplina criada.', { variant: 'success' });
      toast('Salvo às 10h.');
    });
    const regiao = screen.getByRole('status');
    expect(regiao).toHaveTextContent('Disciplina criada.');
    expect(regiao).toHaveTextContent('Salvo às 10h.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Disciplina criada.');
  });

  it('erro entra na região role="alert"', () => {
    render(<Toaster />);
    act(() => {
      toast('Não foi possível salvar.', { variant: 'error' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar.');
    expect(screen.getByRole('status')).not.toHaveTextContent('Não foi possível salvar.');
  });

  it('some sozinho depois da duração', () => {
    render(<Toaster />);
    act(() => {
      toast('Rápido', { durationMs: 1000 });
    });
    expect(screen.getByText('Rápido')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    expect(screen.queryByText('Rápido')).not.toBeInTheDocument();
  });

  it('erro fica mais tempo que os demais por padrão', () => {
    render(<Toaster />);
    act(() => {
      toast('Info', { variant: 'info' });
      toast('Falha', { variant: 'error' });
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Info')).not.toBeInTheDocument();
    expect(screen.getByText('Falha')).toBeInTheDocument();
  });

  it('o botão fecha o aviso e tem nome acessível', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Toaster />);
    act(() => {
      toast('Fechável');
    });
    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText('Fechável')).not.toBeInTheDocument();
  });

  it('passar o mouse pausa a contagem', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Toaster />);
    act(() => {
      toast('Devagar', { durationMs: 1000 });
    });
    await user.hover(screen.getByText('Devagar'));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Devagar')).toBeInTheDocument();
    await user.unhover(screen.getByText('Devagar'));
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    expect(screen.queryByText('Devagar')).not.toBeInTheDocument();
  });

  it('cada tom leva ícone além da cor, e a sombra de flutuação', () => {
    const { container } = render(<Toaster />);
    act(() => {
      toast('Um', { variant: 'success' });
      toast('Dois', { variant: 'error' });
    });
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Um').parentElement?.className).toContain('shadow-raise');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<Toaster />);
    act(() => {
      toast('Salvo.', { variant: 'success' });
      toast('Falhou.', { variant: 'error' });
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
