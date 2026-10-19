Nota A é uma plataforma de preparo para o ENEM e de gestão acadêmica para instituições. O sistema serve três públicos ao mesmo tempo: o aluno de 15 a 19 anos (no celular), a coordenação e o professor (no computador) e a família. O visual é claro, aberto e leve, com a energia da marca concentrada em um ponto por tela: o gradiente do logo, o losango de progresso ou a aurora animada.

## Princípios

- **Claro primeiro, escuro opcional.** O tema `light` é o padrão de todas as telas de trabalho. O `dark` é índigo profundo, tirado do fundo do logo, nunca preto.
- **A marca aparece onde há conquista.** O gradiente `brand-cyan` → `brand-violet` → `brand-magenta` só aparece no `ProgressTrail`, na `Aurora` e na marca. Botões, links e estados usam `primary`.
- **Uma tarefa por tela.** Uma ação principal por área; o resto vai para menus. Menos elementos, mais ar. Densidade baixa cansa menos.
- **Menos caixas.** Seções se separam por espaço e uma linha fina. Painel só quando agrupa um formulário ou uma tabela.
- **Movimento responde, não enfeita.** Só a `Aurora` se move sozinha. Todo o resto anima em resposta a uma ação.
- **Inclusivo por padrão.** Texto em Atkinson Hyperlegible Next, contraste AA em tudo, status sempre com palavra ou ícone, foco visível.

## Conteúdo e voz

- Fale com a pessoa por "você", em português do Brasil, frases curtas e verbos simples.
- Sentence case em tudo: títulos, botões, abas, chips. Nunca caixa alta em rótulos.
- Use "instituição", nunca "escola", no produto e no código.
- Botão diz o que faz e mantém o nome no fluxo: "Publicar boletim" gera "Boletim publicado".
- Erro diz o que aconteceu e como resolver, sem desculpas: "O peso precisa ficar entre 1 e 10."
- Estado vazio convida a agir: "Nenhuma disciplina ainda. Importe a planilha que a instituição já usa."
- Números no formato brasileiro: vírgula decimal ("7,8"), data "12 de setembro" ou "12/09/2026".
- Sem emoji na interface de trabalho. Gamificação do aluno pode usar conquistas ilustradas, nunca emoji em rótulos.

## Cor

- Fundo da página em `paper`, quase branco com um toque frio; painéis, barra lateral e tabelas em `surface` (branco); cabeçalhos de tabela, trilhos e caixas recuadas em `surface-sunken`. Como `paper` e `surface` são quase iguais, o painel se destaca pela linha `line`, não por contraste de fundo.
- Cor com economia: superfícies brancas e tints muito suaves (`violet-tint`, `cyan-tint`). A energia da marca aparece em um ponto por tela. Sem gradiente como fundo de painel, sem gradiente em barras de progresso (a barra usa `primary`) e sem borda colorida lateral em cartões.
- Texto em `ink`; secundário em `ink-muted`. Os dois passam 4,5:1 sobre `paper`, `surface`, `surface-sunken` e todos os tints, nos dois temas.
- Ação principal em `primary` com texto `on-primary`; hover em `primary-hover`. Selecionado em `violet-tint` com texto `primary`.
- Bordas de controle em `line-strong` (3:1). Divisórias em `line`, que não carrega significado.
- Status: `success` aprovado, `warning` recuperação ou atenção, `danger` reprovado ou erro, `info` processo. Cada um tem seu `-tint` de fundo e sempre vem com palavra ou ícone, porque verde e vermelho se diferenciam só pelo matiz.
- `brand-cyan`, `brand-violet` e `brand-magenta` são as cores exatas do gradiente do logo. Use só em formas (`ProgressTrail`, `Aurora`, marca), nunca em texto nem em barras.

## Tipografia

- Títulos, números e a marca em **Sora** (`display` 56/60, `heading-1` 36/44, `heading-2` 26/34, `heading-3` 20/28, `figure` 30/34), com tracking negativo leve (de -0,01em a -0,025em). As formas geométricas conversam com o triângulo e o losango do logo. Hierarquia por tamanho e peso, nunca por caixa alta.
- Texto corrido e interface em **Atkinson Hyperlegible Next** (`lead` 18/30, `body` 16/26, `body-sm` 14/22, `label`, `caption`). Ela foi desenhada para baixa visão e diferencia letras parecidas (I, l, 1), o que ajuda alunos com dislexia.
- Notas, médias e percentuais em `figure` ou em Sora com `font-variant-numeric: tabular-nums`, alinhados à direita.
- Linha de texto curta: até 72 caracteres (`max-w-texto`) e até 60 no `lead`. `display` uma vez por tela, só na landing e no início do aluno.
- As duas fontes vêm do Google Fonts: `Sora:wght@500;600` e `Atkinson+Hyperlegible+Next:wght@400;700`.

## Espaço e layout

- Escala de 4px: `space-1` (4) a `space-8` (72). Painéis com `space-5` de padding; blocos de uma página separados por `space-5` a `space-7`, com uma linha fina quando precisam de divisão. No Tailwind: `p-space-5`, `gap-space-6`, `mt-space-7`.
- Desktop-first para instituição, coordenação e professor: `SideNav` de 248px à esquerda a partir de 1.024px; conteúdo com largura máxima de 1.280px e margem `space-7`.
- Mobile-first para aluno e família: navegação inferior com até 5 destinos abaixo de 768px, margem lateral `space-4`.
- Entre 768px e 1.024px a barra lateral recolhe para ícones.
- Conteúdo alinhado à esquerda, com poucos elementos por tela. Centralizar só a landing.
- Testado em 360, 768, 1024, 1440 e 1920px.

## Forma

- `radius-sm` (8) em campos e células, `radius-md` (12) em botões e avisos, `radius-lg` (20) em painéis, cartões e na grade, `radius-pill` em chips.
- Painéis no fluxo da página não têm sombra nem borda grossa: separam-se por `line` (1px). `shadow-raise` só no que flutua (menu, diálogo, toast).
- Não use borda colorida à esquerda em cartões nem gradiente como fundo de painel.

## Movimento

- `duration-fast` (160ms) para hover, foco e troca de aba; `duration-base` (240ms) para abrir e salvar; `duration-slow` (420ms) para diálogos e o avanço do losango.
- `ease-out` em tudo que responde a uma ação; `ease-in-out` só na `Aurora`.
- Respeite `prefers-reduced-motion`: a `Aurora` para e as transições somem.
- O `Skeleton` é estático: nada além da `Aurora` se move sozinho. O carregamento é anunciado por `aria-busy` e pelo texto, não por pulso.
- A `Aurora` aparece só na landing e na home do aluno.
- Sem entrada animada em cada seção ao rolar a página.

## Iconografia

- O projeto não tem um conjunto de ícones próprio. Este sistema traz só quatro glifos de status (info, sucesso, atenção, erro), em traço de 2px, desenhados no estilo do Lucide.
- Para o produto, use o **Lucide** (`lucide-react`, licença ISC) com traço 2px, 20px na interface e 16px em chips. Substituto sinalizado: troque se a marca adotar um conjunto próprio.
- Ícone sempre acompanhado de texto, exceto em botões só de ícone, que levam `aria-label`.

## Logo

- O símbolo é um "A" formado por um capelo de formatura: losango, triângulo central, duas pernas e a borla, em gradiente horizontal `brand-cyan` → `brand-violet` → `brand-magenta`, com a borla em `brand-blue`.
- Na interface, use sempre `nota-a-simbolo.svg` (vetor, 1,8 KB, fundo transparente): ao lado do nome "Nota A" em Sora 600 na `SideNav`, no topo da landing, no favicon e nos ícones do PWA. Ele funciona sobre `paper` e sobre o índigo do tema escuro.
- No código, copie o SVG para `packages/ui/assets/` e importe como componente ou `<img>`. O gradiente usa `gradientUnits="userSpaceOnUse"`; se o mesmo SVG aparecer duas vezes inline na página, renomeie o `id` do gradiente em uma das cópias.
- `nota-a-simbolo.png` é a cópia em bitmap para onde SVG não entra (e-mail, alguns apps de mensagem). `nota-a-simbolo-fundo-preto.png` é o arquivo original, para redes sociais e vídeo. `nota-a-key-visual.png` é a peça com fundo ilustrado, para capas e apresentações.
- O símbolo é largo (proporção 1,5 : 1). Para favicon e ícone de app, centralize-o num quadrado com fundo `paper` ou com o índigo do tema escuro, ocupando cerca de 80% da largura.
- Altura mínima do símbolo: 20px na tela. Mantenha em volta uma área livre igual à altura da borla.
- Não mude as cores, não aplique o símbolo em uma cor só e não o coloque sobre a `Aurora` com opacidade alta.

## Acessibilidade

- Foco de teclado em `focus`, contorno sólido de 2px com 2px de folga, 3:1 sobre todas as superfícies.
- Alvo de toque mínimo de 44px (`Button` `md`, campos, itens de navegação no celular).
- Campos sempre com rótulo visível; erro ligado ao campo por `aria-describedby`.
- Status nunca só por cor. Tabelas com cabeçalhos de linha e coluna (`scope`).

## No código (Tailwind)

O monorepo usa Tailwind 3 em `apps/web` e tokens em `packages/ui`. Gere as variáveis a partir de `tokens.json` (o `tokens.css` deste sistema) e aponte o tema do Tailwind para elas, para trocar de tema só com `data-theme`:

```js
// packages/ui/tailwind.preset.js
module.exports = {
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)', surface: { DEFAULT: 'var(--surface)', sunken: 'var(--surface-sunken)' },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)' },
        primary: { DEFAULT: 'var(--primary)', hover: 'var(--primary-hover)', on: 'var(--on-primary)' },
        focus: 'var(--focus)', info: 'var(--info)',
        success: { DEFAULT: 'var(--success)', tint: 'var(--success-tint)' },
        warning: { DEFAULT: 'var(--warning)', tint: 'var(--warning-tint)' },
        danger: { DEFAULT: 'var(--danger)', tint: 'var(--danger-tint)' },
        'violet-tint': 'var(--violet-tint)', 'cyan-tint': 'var(--cyan-tint)'
      },
      fontFamily: { display: ['var(--font-display)'], text: ['var(--font-text)'] },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', pill: 'var(--radius-pill)' },
      boxShadow: { raise: 'var(--shadow-raise)' },
      transitionDuration: { fast: '160ms', base: '240ms', slow: '420ms' }
    }
  }
};
```


## Decisões da refatoração leve (substituem o brand book original onde divergem)

| Ponto | Brand book original | Vale agora |
|---|---|---|
| `paper` | `#F5F6FB` | `#FAFBFE`: quase branco, toque frio |
| Tints e linhas | `surface-sunken` `#ECEEF7`, `line` `#DCE0EE`, tints mais saturados | Mais claros: `#F2F4FA`, `#E4E7F3`, `violet-tint` `#F3F0FE`, `cyan-tint` `#ECF7FD` e tints de status mais suaves (contraste AA conferido por teste nos dois temas) |
| Raios | 6 / 10 / 18 | 8 / 12 / 20 |
| Tipografia | `display` 48/52, `heading-1` 32/40, `heading-2` 24/32, `heading-3` 19/26, `figure` 28/32 | 56/60, 36/44, 26/34, 20/28, 30/34, tracking negativo leve; novo estilo `lead` 18/30 |
| Espaço entre blocos | `space-6` entre seções | `space-5` a `space-7` entre blocos |
| Painéis | Painéis separados por `line` | Seções com espaço e uma linha fina; painel só para formulário ou tabela |
| Skeleton | Pulso | Estático |
| Barras de progresso | `gradient` opcional | Sempre `primary`; gradiente só no `ProgressTrail`, na `Aurora` e na marca |
