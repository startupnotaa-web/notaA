import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { GradeGrid, type GradeGridProps } from './GradeGrid';

const colunas: GradeGridProps['columns'] = [
  { id: 'p1', label: 'Prova 1', weight: 2 },
  { id: 'p2', label: 'Prova 2', weight: 1 },
];
const linhas: GradeGridProps['rows'] = [
  { id: 'a1', name: 'Ana Souza', grades: { p1: 8, p2: 7 } },
  { id: 'a2', name: 'Bruno Lima', grades: { p1: 4, p2: 5 } },
];

describe('GradeGrid', () => {
  it('tem cabeçalhos de coluna e de linha com scope', () => {
    render(<GradeGrid columns={colunas} rows={linhas} caption="Notas do 2º trimestre" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.getAttribute('scope'))).toEqual(['col', 'col', 'col', 'col']);
    expect(screen.getByRole('rowheader', { name: 'Ana Souza' })).toHaveAttribute('scope', 'row');
    expect(screen.getByText('Notas do 2º trimestre')).toBeInTheDocument();
  });

  it('cada célula tem nome acessível com coluna e aluno', () => {
    render(<GradeGrid columns={colunas} rows={linhas} />);
    expect(screen.getByRole('textbox', { name: 'Prova 1, Ana Souza' })).toHaveValue('8');
  });

  it('calcula a média ponderada com vírgula decimal', () => {
    render(<GradeGrid columns={colunas} rows={linhas} />);
    const linha = screen.getByRole('row', { name: /Ana Souza/ });
    expect(within(linha).getByText('7,7')).toBeInTheDocument();
  });

  it('média abaixo da mínima aparece com texto, não só com cor', () => {
    render(<GradeGrid columns={colunas} rows={linhas} passing={6} />);
    const linha = screen.getByRole('row', { name: /Bruno Lima/ });
    expect(within(linha).getByText('4,3')).toBeInTheDocument();
    expect(within(linha).getByText('abaixo de 6,0')).toBeInTheDocument();
    const boa = screen.getByRole('row', { name: /Ana Souza/ });
    expect(within(boa).queryByText(/abaixo de/)).not.toBeInTheDocument();
  });

  it('digitar atualiza a média e avisa onChange com o texto digitado', async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<GradeGrid columns={colunas} rows={linhas} onChange={aoMudar} />);
    const celula = screen.getByRole('textbox', { name: 'Prova 1, Bruno Lima' });
    await user.clear(celula);
    await user.type(celula, '9,5');
    expect(aoMudar).toHaveBeenLastCalledWith('a2', 'p1', '9,5');
    const linha = screen.getByRole('row', { name: /Bruno Lima/ });
    expect(within(linha).getByText('8,0')).toBeInTheDocument();
    expect(within(linha).queryByText(/abaixo de/)).not.toBeInTheDocument();
  });

  it('valor fora da faixa marca aria-invalid, explica por texto e mostra ícone', async () => {
    const user = userEvent.setup();
    render(<GradeGrid columns={colunas} rows={linhas} min={0} max={10} />);
    const celula = screen.getByRole('textbox', { name: 'Prova 2, Ana Souza' });
    expect(celula).not.toHaveAttribute('aria-invalid');
    await user.clear(celula);
    await user.type(celula, '11');
    expect(celula).toHaveAttribute('aria-invalid', 'true');
    expect(celula).toHaveAccessibleDescription('Use um valor entre 0 e 10');
    expect(celula.parentElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('texto que não é número também é inválido', async () => {
    const user = userEvent.setup();
    render(<GradeGrid columns={colunas} rows={linhas} />);
    const celula = screen.getByRole('textbox', { name: 'Prova 1, Ana Souza' });
    await user.clear(celula);
    await user.type(celula, 'abc');
    expect(celula).toHaveAttribute('aria-invalid', 'true');
  });

  it('célula vazia não conta na média nem é erro', async () => {
    const user = userEvent.setup();
    render(<GradeGrid columns={colunas} rows={linhas} />);
    const celula = screen.getByRole('textbox', { name: 'Prova 2, Ana Souza' });
    await user.clear(celula);
    expect(celula).not.toHaveAttribute('aria-invalid');
    const linha = screen.getByRole('row', { name: /Ana Souza/ });
    expect(within(linha).getByText('8,0')).toBeInTheDocument();
  });

  it('mostra "–" quando a linha não tem nota nenhuma', () => {
    render(<GradeGrid columns={colunas} rows={[{ id: 'x', name: 'Caio', grades: {} }]} />);
    expect(within(screen.getByRole('row', { name: /Caio/ })).getByText('–')).toBeInTheDocument();
  });

  it('ressincroniza quando os dados de fora mudam, sem apagar a digitação a cada render', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GradeGrid columns={colunas} rows={linhas} />);
    const celula = screen.getByRole('textbox', { name: 'Prova 1, Ana Souza' });
    await user.clear(celula);
    await user.type(celula, '3');
    // mesmo conteúdo, array novo: mantém o que a pessoa digitou
    rerender(<GradeGrid columns={colunas} rows={linhas.map((l) => ({ ...l }))} />);
    expect(screen.getByRole('textbox', { name: 'Prova 1, Ana Souza' })).toHaveValue('3');
    // conteúdo diferente: ressincroniza
    rerender(<GradeGrid columns={colunas} rows={[{ id: 'a1', name: 'Ana Souza', grades: { p1: 10, p2: 10 } }]} />);
    expect(screen.getByRole('textbox', { name: 'Prova 1, Ana Souza' })).toHaveValue('10');
  });

  it('não tem violações de acessibilidade, nem com célula inválida', async () => {
    const { container } = render(
      <GradeGrid columns={colunas} rows={[{ id: 'a1', name: 'Ana', grades: { p1: 12, p2: 7 } }, ...linhas]} caption="Notas" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
