import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { AppFrame } from './AppFrame';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette, type ComandoItem } from './CommandPalette';
import { DataTable, type ColunaDaTabela } from './DataTable';
import { Col, Grade } from './Grade';
import { KpiRow } from './KpiRow';
import { MasterDetail } from './MasterDetail';
import { Menu } from './Menu';
import { SidePanel } from './SidePanel';
import { ShortcutsDialog } from './ShortcutsDialog';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { Zonas } from './Zonas';
import { useAtalhos } from '../lib/atalhos';

describe('AppFrame', () => {
  it('ocupa a altura da tela e só a área de trabalho rola', () => {
    const { container } = render(
      <AppFrame nav={<nav aria-label="Principal">menu</nav>} topbar={<header>barra</header>}>
        conteúdo
      </AppFrame>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain('h-dvh');
    expect((container.firstElementChild as HTMLElement).className).toContain('overflow-hidden');
    const main = screen.getByRole('main');
    expect(main).toHaveClass('overflow-y-auto');
    expect(main).toHaveAttribute('id', 'conteudo');
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo');
  });

  it('com navegação inferior reserva espaço no fim da área de trabalho', () => {
    render(
      <AppFrame bottomNav={<nav aria-label="Inferior">x</nav>}>
        x
      </AppFrame>,
    );
    expect(screen.getByRole('main').className).toContain('pb-[72px]');
  });
});

describe('TopBar', () => {
  it('mostra o campo de busca e o atalho, e abre a paleta', async () => {
    const user = userEvent.setup();
    const aoBuscar = vi.fn();
    render(<TopBar aoBuscar={aoBuscar} esquerda={<span>Contexto</span>} conta={<button type="button">Conta</button>} />);
    const botao = screen.getByRole('button', { name: /Buscar telas e ações/ });
    expect(botao).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    await user.click(botao);
    expect(aoBuscar).toHaveBeenCalled();
    expect(screen.getByRole('banner')).toHaveClass('h-topbar');
  });
});

const itens: ComandoItem[] = [
  { id: 'painel', rotulo: 'Painel', grupo: 'Ir para', aoSelecionar: vi.fn() },
  { id: 'alunos', rotulo: 'Alunos', grupo: 'Ir para', aoSelecionar: vi.fn() },
  { id: 'importar', rotulo: 'Importar planilha', grupo: 'Ações', palavras: ['csv'], aoSelecionar: vi.fn() },
];

describe('CommandPalette', () => {
  it('abre com foco no campo e lista os itens agrupados', () => {
    render(<CommandPalette open onClose={() => {}} itens={itens} />);
    expect(screen.getByRole('combobox', { name: 'Buscar' })).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('Ir para')).toBeInTheDocument();
  });

  it('filtra sem acento e sem caixa, inclusive por palavras extras', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={() => {}} itens={itens} />);
    await user.type(screen.getByRole('combobox'), 'CSV');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Importar planilha/ })).toBeInTheDocument();
  });

  it('setas movem a opção ativa e Enter executa e fecha', async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    const alunos = vi.fn();
    render(
      <CommandPalette
        open
        onClose={aoFechar}
        itens={[
          { id: 'a', rotulo: 'Painel', aoSelecionar: vi.fn() },
          { id: 'b', rotulo: 'Alunos', aoSelecionar: alunos },
        ]}
      />,
    );
    const campo = screen.getByRole('combobox');
    expect(screen.getByRole('option', { name: 'Painel' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Alunos' })).toHaveAttribute('aria-selected', 'true');
    expect(campo).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Alunos' }).id);
    await user.keyboard('{Enter}');
    expect(alunos).toHaveBeenCalled();
    expect(aoFechar).toHaveBeenCalled();
  });

  it('Esc fecha e mostra mensagem quando nada é encontrado', async () => {
    const user = userEvent.setup();
    const aoFechar = vi.fn();
    render(<CommandPalette open onClose={aoFechar} itens={itens} />);
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText(/Nada encontrado/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(aoFechar).toHaveBeenCalled();
  });

  it('não tem violações de acessibilidade', async () => {
    render(<CommandPalette open onClose={() => {}} itens={itens} />);
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('ShortcutsDialog', () => {
  it('lista os atalhos agrupados, com teclas em kbd', () => {
    render(
      <ShortcutsDialog
        open
        onClose={() => {}}
        grupos={[{ titulo: 'Geral', itens: [{ teclas: ['Ctrl', 'K'], descricao: 'Abrir a busca' }] }]}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeInTheDocument();
    expect(screen.getByText('Abrir a busca')).toBeInTheDocument();
    expect(screen.getByText('K').tagName).toBe('KBD');
  });
});

describe('SidePanel', () => {
  it('é um diálogo modal nomeado, prende o foco, fecha com Esc e devolve o foco', async () => {
    const user = userEvent.setup();
    function Cena() {
      const [aberto, setAberto] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setAberto(true)}>
            Abrir
          </button>
          <SidePanel open={aberto} onClose={() => setAberto(false)} title="Detalhe do aluno" footer={<button type="button">Salvar</button>}>
            <input aria-label="Nota" />
          </SidePanel>
        </>
      );
    }
    render(<Cena />);
    const gatilho = screen.getByRole('button', { name: 'Abrir' });
    await user.click(gatilho);
    const painel = screen.getByRole('dialog', { name: 'Detalhe do aluno' });
    expect(painel).toHaveAttribute('aria-modal', 'true');
    expect(painel.className).toContain('shadow-raise');
    expect(painel.className).toContain('motion-reduce:animate-none');
    // Tab cicla dentro do painel.
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(painel.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gatilho).toHaveFocus();
  });
});

describe('Breadcrumbs e KpiRow', () => {
  it('marca a página atual e usa um nav nomeado', () => {
    render(
      <Breadcrumbs
        itens={[
          { rotulo: 'Instituição', href: '/instituicao' },
          { rotulo: 'Alunos', href: '/instituicao/alunos' },
          { rotulo: 'Ana Ribeiro' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toBeInTheDocument();
    expect(screen.getByText('Ana Ribeiro')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Alunos' })).toHaveAttribute('href', '/instituicao/alunos');
  });

  it('KpiRow lista os indicadores com a variação em palavras', () => {
    render(<KpiRow itens={[{ id: 'a', rotulo: 'Alunos', valor: '61', variacao: { texto: '+4 esta semana', tom: 'success' } }, { id: 'b', rotulo: 'Turmas', valor: '2' }]} />);
    expect(screen.getByText('Alunos').tagName).toBe('DT');
    expect(screen.getByText('+4 esta semana')).toBeInTheDocument();
  });
});

describe('Grade, Zonas e MasterDetail', () => {
  it('Col mapeia as colunas por ponto de quebra e empilha no celular', () => {
    const { container } = render(
      <Grade>
        <Col lg={8} xl={6}>
          a
        </Col>
      </Grade>,
    );
    const col = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
    expect(col.className).toContain('col-span-12');
    expect(col.className).toContain('lg:col-span-8');
    expect(col.className).toContain('xl:col-span-6');
    expect((container.firstElementChild as HTMLElement).className).toContain('grid-cols-12');
  });

  it('Zonas deixa o contexto numa região e, em telas menores, abre um drawer', async () => {
    const user = userEvent.setup();
    render(<Zonas principal={<p>Principal</p>} contexto={<p>Resumo do dia</p>} />);
    expect(screen.getByText('Principal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Resumo e ações/ }));
    const drawer = screen.getByRole('dialog', { name: 'Resumo e ações' });
    expect(within(drawer).getByText('Resumo do dia')).toBeInTheDocument();
  });

  it('MasterDetail mostra o vazio sem seleção e o detalhe com seleção (com Voltar)', async () => {
    const user = userEvent.setup();
    const aoVoltar = vi.fn();
    const { rerender } = render(<MasterDetail lista={<p>Lista</p>} detalhe={null} vazio="Escolha um aluno" />);
    expect(screen.getByText('Escolha um aluno')).toBeInTheDocument();
    rerender(<MasterDetail lista={<p>Lista</p>} detalhe={<p>Detalhe</p>} aoVoltar={aoVoltar} />);
    expect(screen.getByText('Detalhe')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(aoVoltar).toHaveBeenCalled();
  });
});

interface Aluno {
  id: string;
  nome: string;
  xp: number;
  turma: string;
}
const alunos: Aluno[] = [
  { id: '1', nome: 'Carla', xp: 1720, turma: '3º A' },
  { id: '2', nome: 'Bruno', xp: 980, turma: '3º A' },
  { id: '3', nome: 'Davi', xp: 1310, turma: '3º B' },
];
const colunas: ColunaDaTabela<Aluno>[] = [
  { id: 'nome', rotulo: 'Aluno', celula: (a) => a.nome, ordenar: (a, b) => a.nome.localeCompare(b.nome), obrigatoria: true },
  { id: 'xp', rotulo: 'XP', celula: (a) => a.xp, ordenar: (a, b) => a.xp - b.xp, alinhar: 'direita' },
  { id: 'turma', rotulo: 'Turma', celula: (a) => a.turma, ocultaPorPadrao: true },
];

function Tabela(props: Partial<React.ComponentProps<typeof DataTable<Aluno>>>) {
  const [sel, setSel] = React.useState<string[]>([]);
  return (
    <DataTable
      caption="Alunos"
      colunas={colunas}
      linhas={alunos}
      idDaLinha={(a) => a.id}
      selecionavel
      selecionadas={sel}
      onSelecionar={setSel}
      acoesEmLote={(ids) => <button type="button">Arquivar {ids.length}</button>}
      {...props}
    />
  );
}

const nomes = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[1]!.textContent);

describe('DataTable', () => {
  it('é uma tabela nomeada, em região rolável com foco, com cabeçalho e primeira coluna fixos', () => {
    render(<Tabela />);
    expect(screen.getByRole('table', { name: 'Alunos' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Alunos' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('columnheader', { name: /Aluno/ }).className).toContain('sticky');
  });

  it('ordena por coluna e anuncia aria-sort (asc, desc, nenhum)', async () => {
    const user = userEvent.setup();
    render(<Tabela />);
    const cab = screen.getByRole('columnheader', { name: /Aluno/ });
    await user.click(within(cab).getByRole('button'));
    expect(cab).toHaveAttribute('aria-sort', 'ascending');
    expect(nomes()).toEqual(['Bruno', 'Carla', 'Davi']);
    await user.click(within(cab).getByRole('button'));
    expect(cab).toHaveAttribute('aria-sort', 'descending');
    expect(nomes()).toEqual(['Davi', 'Carla', 'Bruno']);
    await user.click(within(cab).getByRole('button'));
    expect(nomes()).toEqual(['Carla', 'Bruno', 'Davi']);
  });

  it('seleciona linhas e todas, e mostra a barra de ações em lote', async () => {
    const user = userEvent.setup();
    render(<Tabela />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar linha 1' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 selecionada');
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todas as linhas' }));
    expect(screen.getByRole('status')).toHaveTextContent('3 selecionadas');
    expect(screen.getByRole('button', { name: 'Arquivar 3' })).toBeInTheDocument();
  });

  it('colunas configuráveis: a oculta por padrão aparece ao ligar; a obrigatória não desliga', async () => {
    const user = userEvent.setup();
    render(<Tabela />);
    expect(screen.queryByRole('columnheader', { name: 'Turma' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Colunas' }));
    await user.click(screen.getByRole('checkbox', { name: 'Turma' }));
    expect(screen.getByRole('columnheader', { name: 'Turma' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Aluno' })).toBeDisabled();
  });

  it('alterna a densidade (confortável e compacta)', async () => {
    const user = userEvent.setup();
    render(<Tabela />);
    const tabela = screen.getByRole('table');
    expect(tabela.className).toContain('row-comfortable');
    await user.click(screen.getByRole('radio', { name: 'Compacta' }));
    expect(tabela.className).toContain('row-compact');
    expect(screen.getByRole('radio', { name: 'Compacta' })).toHaveAttribute('aria-checked', 'true');
  });

  it('teclado: setas movem a linha em foco; Enter abre; Espaço marca', async () => {
    const user = userEvent.setup();
    const aoAbrir = vi.fn();
    render(<Tabela aoAbrir={aoAbrir} />);
    const linhas = screen.getAllByRole('row').slice(1);
    linhas[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(linhas[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(linhas[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(linhas[0]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(aoAbrir).toHaveBeenCalledWith(alunos[0]);
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox', { name: 'Selecionar linha 1' })).toBeChecked();
  });

  it('mostra o estado vazio e não tem violações de acessibilidade', async () => {
    const { container, rerender } = render(<Tabela />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<Tabela linhas={[]} vazio={<p>Nenhum aluno aqui.</p>} />);
    expect(screen.getByText('Nenhum aluno aqui.')).toBeInTheDocument();
  });
});

describe('useAtalhos', () => {
  function Cena({ aoK, aoPonto }: { aoK: () => void; aoPonto: () => void }) {
    useAtalhos([
      { tecla: 'k', mod: true, aoAcionar: aoK },
      { tecla: '?', aoAcionar: aoPonto },
    ]);
    return <input aria-label="campo" />;
  }

  it('Ctrl+K dispara em qualquer lugar; ? só fora de campos de texto', async () => {
    const user = userEvent.setup();
    const aoK = vi.fn();
    const aoPonto = vi.fn();
    render(<Cena aoK={aoK} aoPonto={aoPonto} />);
    await user.keyboard('{Control>}k{/Control}');
    expect(aoK).toHaveBeenCalledTimes(1);
    await user.keyboard('?');
    expect(aoPonto).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText('campo'));
    await user.keyboard('?');
    expect(aoPonto).toHaveBeenCalledTimes(1);
    act(() => {});
  });
});

describe('SideNav recolhida e Menu marcável', () => {
  const itensNav = [{ id: 'a', label: 'Painel', href: '/a', icon: <svg /> }];

  it('recolhida deixa só ícones em qualquer largura e o botão alterna', async () => {
    const user = userEvent.setup();
    const aoRecolher = vi.fn();
    render(<SideNav items={itensNav} recolhida onRecolher={aoRecolher} />);
    expect(screen.getByRole('navigation').className).toContain('w-sidenav-recolhida');
    expect(screen.getByText('Painel')).toHaveClass('sr-only');
    await user.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(aoRecolher).toHaveBeenCalled();
  });

  it('item marcável do Menu vira menuitemradio com aria-checked', async () => {
    const user = userEvent.setup();
    render(
      <Menu
        label="Contexto"
        items={[
          { id: 'a', label: '2026', checked: true, onSelect: () => {} },
          { id: 'b', label: '2025', checked: false, onSelect: () => {} },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Contexto' }));
    expect(screen.getByRole('menuitemradio', { name: '2026' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: '2025' })).toHaveAttribute('aria-checked', 'false');
  });
});
