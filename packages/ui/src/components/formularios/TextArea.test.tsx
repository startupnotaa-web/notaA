import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('liga o rótulo e a dica ao campo', () => {
    render(<TextArea label="Seu texto" hint="Escreva de 8 a 30 linhas." />);
    const campo = screen.getByLabelText('Seu texto');
    expect(campo.tagName).toBe('TEXTAREA');
    expect(campo).toHaveAccessibleDescription('Escreva de 8 a 30 linhas.');
  });

  it('o erro substitui a dica e marca aria-invalid', () => {
    render(<TextArea label="Texto" hint="Dica" error="Escreva pelo menos 8 linhas." />);
    const campo = screen.getByLabelText('Texto');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Escreva pelo menos 8 linhas.');
  });

  it('tem altura mínima de 44px e aceita digitação', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<TextArea label="Mensagem" onChange={aoMudar} />);
    const campo = screen.getByLabelText('Mensagem');
    expect(campo.className).toContain('min-h-[44px]');
    await user.type(campo, 'oi');
    expect(aoMudar).toHaveBeenCalled();
  });

  it('com rótulo oculto ainda tem nome acessível', () => {
    render(<TextArea label="Mensagem para o tutor" labelOculto />);
    expect(screen.getByRole('textbox', { name: 'Mensagem para o tutor' })).toBeInTheDocument();
    expect(screen.getByText('Mensagem para o tutor')).toHaveClass('sr-only');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<TextArea label="Texto" hint="Dica" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
