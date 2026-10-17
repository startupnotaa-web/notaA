import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { Notice } from './Notice';
import { EmptyState } from './EmptyState';

describe('Notice', () => {
  it('erro anuncia na hora com role="alert"', () => {
    render(<Notice tone="danger" title="Não foi possível salvar">Confira o peso.</Notice>);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar');
  });

  it.each(['info', 'success', 'warning'] as const)('%s usa role="status"', (tone) => {
    render(<Notice tone={tone}>Texto</Notice>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('o padrão é informativo', () => {
    render(<Notice>Texto</Notice>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)('o tom %s leva ícone decorativo', (tone) => {
    const { container } = render(<Notice tone={tone}>Texto</Notice>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('mostra título, corpo e ação', () => {
    render(
      <Notice title="Rascunho" action={<button type="button">Publicar</button>}>
        Ainda não publicado.
      </Notice>,
    );
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByText('Ainda não publicado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeInTheDocument();
  });

  it('não tem violações de acessibilidade em todos os tons', async () => {
    const { container } = render(
      <>
        {(['info', 'success', 'warning', 'danger'] as const).map((t) => (
          <Notice key={t} tone={t} title={t}>
            Mensagem
          </Notice>
        ))}
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('EmptyState', () => {
  it('é uma região nomeada pelo título', () => {
    render(<EmptyState title="Nenhuma disciplina ainda">Importe a planilha.</EmptyState>);
    expect(screen.getByRole('region', { name: 'Nenhuma disciplina ainda' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Nenhuma disciplina ainda');
  });

  it('mostra as ações quando há', () => {
    render(<EmptyState title="Vazio" actions={<button type="button">Importar</button>} />);
    expect(screen.getByRole('button', { name: 'Importar' })).toBeInTheDocument();
  });

  it('a ilustração é decorativa', () => {
    const { container } = render(<EmptyState title="Vazio" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<EmptyState title="Vazio" actions={<button type="button">Importar</button>}>Texto</EmptyState>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
