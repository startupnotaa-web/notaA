import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ActionRow } from './ActionRow';
import { Chip } from './Chip';
import { PageHeader } from './PageHeader';
import { Panel } from './Panel';
import { Section } from './Section';
import { Carregando, Skeleton, SkeletonLinhas, SkeletonText } from './Skeleton';
import { SummaryStrip } from './SummaryStrip';
import { ThemeSwitch } from './ThemeSwitch';

describe('Section', () => {
  it('é uma região nomeada pelo título', () => {
    render(<Section title="Precisa de você">conteúdo</Section>);
    expect(screen.getByRole('region', { name: 'Precisa de você' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Precisa de você' })).toBeInTheDocument();
  });

  it('separa por uma linha fina, sem cartão: nada de fundo, sombra ou borda lateral', () => {
    const { container } = render(
      <Section title="Agenda" divided>
        x
      </Section>,
    );
    const classes = (container.firstElementChild as HTMLElement).className;
    expect(classes).toContain('border-t border-line');
    expect(classes).not.toMatch(/\bbg-|shadow|\bborder-l-/);
  });

  it('aceita ação e descrição', () => {
    render(
      <Section title="Turmas" description="Todas as turmas do ano" action={<button type="button">Nova turma</button>}>
        x
      </Section>,
    );
    expect(screen.getByText('Todas as turmas do ano')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova turma' })).toBeInTheDocument();
  });
});

describe('Panel', () => {
  it('agrupa um formulário ou tabela, sem sombra', () => {
    const { container } = render(<Panel title="Configuração">campos</Panel>);
    const classes = (container.firstElementChild as HTMLElement).className;
    expect(classes).toContain('rounded-lg border border-line bg-surface');
    expect(classes).not.toContain('shadow');
    expect(screen.getByRole('region', { name: 'Configuração' })).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('tem um h1, o status e as ações', () => {
    render(
      <PageHeader
        title="Regra avaliativa"
        description="Defina como a média é calculada."
        status={<Chip tone="warning">Rascunho</Chip>}
        actions={<button type="button">Publicar regra</button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Regra avaliativa' })).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar regra' })).toBeInTheDocument();
  });
});

describe('ActionRow', () => {
  it('mostra status, título, texto e ação', () => {
    render(
      <ul>
        <ActionRow
          status={<Chip tone="danger">Atrasado</Chip>}
          title="Lançar notas do 2º trimestre"
          description="3º ano A"
          action={<button type="button">Lançar</button>}
        />
      </ul>,
    );
    expect(screen.getByRole('listitem')).toHaveTextContent('Atrasado');
    expect(screen.getByText('Lançar notas do 2º trimestre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lançar' })).toBeInTheDocument();
  });
});

describe('SummaryStrip', () => {
  it('lista rótulos e valores como termos e definições', () => {
    render(
      <SummaryStrip
        items={[
          { id: 'a', label: 'Alunos', value: '61' },
          { id: 'b', label: 'Média da turma', value: '7,8', hint: 'Acima do mínimo' },
        ]}
      />,
    );
    expect(screen.getByText('Alunos').tagName).toBe('DT');
    expect(screen.getByText('7,8').tagName).toBe('DD');
    expect(screen.getByText('Acima do mínimo')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('não anima sozinho: só a Aurora se move', () => {
    const { container } = render(
      <>
        <Skeleton className="h-4" />
        <SkeletonText />
        <SkeletonLinhas />
      </>,
    );
    expect(container.innerHTML).not.toMatch(/animate-/);
  });

  it('Carregando anuncia o carregamento para leitor de tela', () => {
    render(
      <Carregando rotulo="Carregando seu painel">
        <Skeleton className="h-4" />
      </Carregando>,
    );
    const regiao = screen.getByRole('status');
    expect(regiao).toHaveAttribute('aria-busy', 'true');
    expect(regiao).toHaveTextContent('Carregando seu painel…');
  });
});

describe('ThemeSwitch', () => {
  it('é um grupo de rádio com a opção atual marcada', () => {
    render(<ThemeSwitch value="light" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Claro' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Escuro' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Do sistema' })).toBeInTheDocument();
  });

  it('clique e setas mudam a opção', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<ThemeSwitch value="light" onChange={aoMudar} />);
    await user.click(screen.getByRole('radio', { name: 'Escuro' }));
    expect(aoMudar).toHaveBeenLastCalledWith('dark');
    screen.getByRole('radio', { name: 'Claro' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(aoMudar).toHaveBeenLastCalledWith('dark');
  });

  it('cada opção tem alvo de 44px', () => {
    render(<ThemeSwitch value="dark" onChange={() => {}} />);
    for (const r of screen.getAllByRole('radio')) expect(r.className).toContain('min-h-[44px]');
  });
});

describe('estrutura leve', () => {
  it('não tem violações de acessibilidade', async () => {
    const { container } = render(
      <main>
        <PageHeader title="Painel" status={<Chip tone="success">Em dia</Chip>} />
        <Section title="Precisa de você" divided>
          <ul>
            <ActionRow title="Lançar notas" action={<button type="button">Lançar</button>} />
          </ul>
        </Section>
        <SummaryStrip items={[{ id: 'a', label: 'Alunos', value: '61' }]} />
        <Panel title="Turmas">x</Panel>
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
