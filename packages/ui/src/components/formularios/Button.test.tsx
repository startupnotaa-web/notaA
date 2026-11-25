import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';

describe('Button', () => {
  it('é type="button" por padrão, para não enviar formulários sem querer', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button');
  });

  it('aciona com Enter e Espaço', async () => {
    const user = userEvent.setup();
    const aoClicar = vi.fn();
    render(<Button onClick={aoClicar}>Publicar boletim</Button>);
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(aoClicar).toHaveBeenCalledTimes(2);
  });

  it('em loading fica desabilitado, marca aria-busy e não dispara o clique', async () => {
    const user = userEvent.setup();
    const aoClicar = vi.fn();
    render(
      <Button loading onClick={aoClicar}>
        Salvando
      </Button>,
    );
    const botao = screen.getByRole('button', { name: 'Salvando' });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('aria-busy', 'true');
    await user.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it('não tem aria-busy quando não está carregando', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('md tem alvo de 44px e sm de 36px', () => {
    render(
      <>
        <Button>Médio</Button>
        <Button size="sm">Pequeno</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Médio' }).className).toContain('min-h-[44px]');
    expect(screen.getByRole('button', { name: 'Pequeno' }).className).toContain('min-h-[36px]');
  });

  it('cada variante tem uma única cor de borda (secundário e perigo mostram a borda)', () => {
    render(
      <>
        <Button variant="primary">P</Button>
        <Button variant="secondary">S</Button>
        <Button variant="quiet">Q</Button>
        <Button variant="danger">D</Button>
      </>,
    );
    const cor = (n: string) => screen.getByRole('button', { name: n }).className.split(' ').filter((c) => /^border-(?!2$)/.test(c));
    expect(cor('P')).toEqual(['border-transparent']);
    expect(cor('S')).toEqual(['border-line-strong']);
    expect(cor('Q')).toEqual(['border-transparent']);
    expect(cor('D')).toEqual(['border-danger']);
  });

  it('não tem violações de acessibilidade nas quatro variantes', async () => {
    const { container } = render(
      <>
        <Button variant="primary">Primário</Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="quiet">Discreto</Button>
        <Button variant="danger">Excluir</Button>
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ButtonLink', () => {
  it('renderiza um link com a aparência do botão', () => {
    render(<ButtonLink href="/instituicao">Abrir painel</ButtonLink>);
    const link = screen.getByRole('link', { name: 'Abrir painel' });
    expect(link).toHaveAttribute('href', '/instituicao');
    expect(link.className).toContain('min-h-[44px]');
  });

  it('aceita outro componente de link', () => {
    const Meu = ({ to, ...props }: { to: string; className?: string; children: React.ReactNode }) => <a href={to} {...props} />;
    render(
      <ButtonLink as={Meu} to="/x" variant="secondary">
        Ir
      </ButtonLink>,
    );
    expect(screen.getByRole('link', { name: 'Ir' })).toHaveAttribute('href', '/x');
  });
});
