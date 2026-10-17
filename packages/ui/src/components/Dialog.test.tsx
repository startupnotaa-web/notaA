import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

function Exemplo({ aoFechar = () => {}, fecharNoVeu }: { aoFechar?: () => void; fecharNoVeu?: boolean }) {
  const [aberto, setAberto] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir regra
      </button>
      <Dialog
        open={aberto}
        onClose={() => {
          aoFechar();
          setAberto(false);
        }}
        closeOnScrim={fecharNoVeu}
        title="Publicar boletim"
        description="Depois de publicado, a família enxerga as notas."
        footer={
          <>
            <button type="button">Cancelar</button>
            <button type="button">Publicar</button>
          </>
        }
      >
        <label>
          Observação
          <input />
        </label>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('não renderiza nada quando fechado', () => {
    render(<Dialog open={false} onClose={() => {}} title="X" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('é um diálogo modal nomeado pelo título e descrito pelo texto de apoio', async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    await user.click(screen.getByRole('button', { name: 'Abrir regra' }));
    const dialogo = screen.getByRole('dialog', { name: 'Publicar boletim' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleDescription('Depois de publicado, a família enxerga as notas.');
  });

  it('leva o foco para o primeiro controle ao abrir', async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    await user.click(screen.getByRole('button', { name: 'Abrir regra' }));
    expect(screen.getByLabelText('Observação')).toHaveFocus();
  });

  it('prende o foco: Tab e Shift+Tab ciclam dentro do diálogo', async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    await user.click(screen.getByRole('button', { name: 'Abrir regra' }));
    const dialogo = screen.getByRole('dialog');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Publicar' })).toHaveFocus();
    await user.tab(); // passa do último: volta ao primeiro
    expect(screen.getByLabelText('Observação')).toHaveFocus();
    await user.tab({ shift: true }); // antes do primeiro: vai ao último
    expect(screen.getByRole('button', { name: 'Publicar' })).toHaveFocus();
    expect(dialogo).toContainElement(document.activeElement as HTMLElement);
  });

  it('Esc fecha e devolve o foco ao botão que abriu', async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    render(<Exemplo aoFechar={aoFechar} />);
    const gatilho = screen.getByRole('button', { name: 'Abrir regra' });
    await user.click(gatilho);
    await user.keyboard('{Escape}');
    expect(aoFechar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gatilho).toHaveFocus();
  });

  it('clicar no véu fecha por padrão', async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    render(<Exemplo aoFechar={aoFechar} />);
    await user.click(screen.getByRole('button', { name: 'Abrir regra' }));
    await user.click(screen.getByTestId('dialog-scrim'));
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('com closeOnScrim=false o véu não fecha, mas Esc ainda fecha', async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    render(<Exemplo aoFechar={aoFechar} fecharNoVeu={false} />);
    await user.click(screen.getByRole('button', { name: 'Abrir regra' }));
    await user.click(screen.getByTestId('dialog-scrim'));
    expect(aoFechar).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('trava a rolagem da página enquanto aberto e a libera ao fechar', async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    await user.click(screen.getByRole('button', { name: 'Abrir regra' }));
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('sem controles dentro, o foco fica no próprio painel', async () => {
    render(<Dialog open onClose={() => {}} title="Aviso" />);
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('usa a sombra de flutuação e a entrada lenta (420ms), e para com reduced motion', async () => {
    render(<Dialog open onClose={() => {}} title="Aviso" />);
    const classes = screen.getByRole('dialog').className;
    expect(classes).toContain('shadow-raise');
    expect(classes).toContain('420ms');
    expect(classes).toContain('motion-reduce:animate-none');
  });

  it('não tem violações de acessibilidade', async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    await user.click(screen.getByRole('button', { name: 'Abrir regra' }));
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
