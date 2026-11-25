import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { Table } from './Table';

const montar = (props = {}) =>
  render(
    <Table caption="Alunos da turma" {...props}>
      <thead>
        <tr>
          <th scope="col">Aluno</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Ana</th>
        </tr>
      </tbody>
    </Table>,
  );

describe('Table', () => {
  it('a região rolável é focável por teclado e tem nome (WCAG 2.1.1)', async () => {
    const user = userEvent.setup();
    montar();
    await user.tab();
    expect(screen.getByRole('region', { name: 'Alunos da turma' })).toHaveFocus();
  });

  it('o wrapper é posicionado: filhos absolutos (sr-only) não escapam da rolagem e alargam a página', () => {
    montar();
    expect(screen.getByRole('region').className).toContain('relative');
  });

  it('a legenda pode ficar só para leitor de tela', () => {
    montar({ captionOculta: true });
    expect(screen.getByText('Alunos da turma', { selector: 'caption' })).toHaveClass('sr-only');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = montar();
    expect(await axe(container)).toHaveNoViolations();
  });
});
