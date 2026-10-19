# 07 — Design System & Inclusão

> Design system "Nota A": tokens como variáveis CSS, tema claro por padrão e escuro opcional, componentes em `packages/ui`. Acessibilidade é **requisito**, não enfeite.
>
> Fonte dos valores: `packages/ui/tokens/tokens.json`. O CSS (`packages/ui/src/tokens/tokens.css`) é **gerado** por `pnpm --filter @notaa/ui tokens` e conferido no lint (`tokens:check`). Nenhum outro arquivo repete um hexadecimal.

---

## 1. Princípios

1. **Claro primeiro, escuro opcional.** `data-theme="light"` é o padrão em `<html>`. O escuro (`data-theme="dark"`) é índigo profundo, nunca preto, e a escolha fica em `localStorage` (`notaa:tema`), aplicada antes da pintura.
2. **A marca aparece onde há conquista.** O gradiente `brand-cyan` → `brand-violet` → `brand-magenta` só vive no símbolo, no `ProgressTrail` e na `Aurora`. Botões, links e estados usam `primary`. Essas três cores nunca são cor de texto.
3. **Uma tarefa por tela.** Densidade baixa cansa menos.
4. **Movimento responde, não enfeita.** Só a `Aurora` se move sozinha, e só na home do aluno e na landing. O `Skeleton` é estático.
   - **Leve e iluminada.** Superfícies brancas, tints suaves, seções separadas por espaço e uma linha fina. Painel só para formulário ou tabela. A energia da marca aparece em um ponto por tela.
5. **Inclusivo por padrão.** Contraste AA, status sempre com palavra ou ícone, foco visível, alvos de 44px.
6. **Tokens primeiro.** Toda cor e medida vem de variável; trocar de tema é trocar `data-theme`.

## 2. Tokens e Tailwind

- `tailwind.preset.js` (em `packages/ui`) mapeia os tokens para utilitários: `bg-paper`, `bg-surface`, `bg-surface-sunken`, `border-line`, `border-line-strong`, `text-ink`, `text-ink-muted`, `bg-primary`, `text-primary`, `bg-violet-tint`, `bg-success-tint`, `text-danger`, `shadow-raise`, `rounded-sm|md|lg|pill`, `duration-fast|base|slow`, `ease-out|ease-in-out` (as curvas dos tokens), `font-display`, `font-text`, os estilos de texto (`text-display`, `text-heading-1` a `-3`, `text-figure`, `text-lead`, `text-body`, `text-body-sm`, `text-label`, `text-caption`) e a escala de espaço (`p-space-5`, `gap-space-6`, `mt-space-7`…). `p-5` e companhia continuam sendo a escala padrão do Tailwind.
- `apps/web/tailwind.config.ts` usa o preset e carrega um bloco `legacy` com os nomes do sistema antigo (`bg-bg`, `text-text`, `text-text-muted`, `border-border`, `bg-surface-2`, `text-error`, `bg-brand-primary` …), apontados para os tokens novos. **Dívida declarada:** só as telas de aluno, família e onboarding ainda o usam. Remova cada alias quando nada mais o referenciar.
- Código que não aceita `var()` (manifest, `themeColor`, geração de ícones) lê os valores de `corDoToken()`, exportado por `@notaa/ui`.
- Hex fora de `tokens.json`/`tokens.css` é erro. A única exceção é `packages/ui/assets/nota-a-simbolo.svg`, arquivo-fonte da marca usado para gerar os ícones; a interface usa o componente `NotaASimbolo`, que lê as variáveis.

## 3. Cor

- Página em `paper`; painéis, barra lateral e tabelas em `surface`; cabeçalhos de tabela e trilhos em `surface-sunken`.
- Texto em `ink`; secundário em `ink-muted`.
- Ação principal em `primary` com `on-primary`; hover em `primary-hover`; selecionado em `violet-tint` com texto `primary`.
- Borda de controle em `line-strong` (3:1). Divisória em `line`, que não carrega significado.
- Status: `success` aprovado, `warning` recuperação ou atenção, `danger` reprovado ou erro, `info` processo, cada um com seu `-tint`. **Nunca só por cor**: sempre palavra ou ícone.
- `scrim` é o véu atrás de diálogos e da navegação aberta.

## 4. Tipografia

- **Sora** (500, 600) em `display` (56/60), `heading-1` (36/44), `heading-2` (26/34), `heading-3` (20/28) e `figure` (30/34), com tracking negativo leve; **Atkinson Hyperlegible Next** (400, 700) em `body`, `body-sm`, `label` e `caption`. Ambas por `next/font` em `apps/web/app/layout.tsx`, sem `@import`.
- Notas, médias e percentuais: Sora com algarismos tabulares (`.tabular`), alinhados à direita, com vírgula decimal.
- Linha de texto com até 72 caracteres. `display` uma vez por tela, só na landing e no início do aluno.
- Sentence case em tudo; nunca caixa alta em rótulos.

## 5. Espaço, forma e layout

- Escala de 4px (`space-1` 4 a `space-8` 72). Painéis com `space-5` de padding; blocos de uma página separados por `space-5` a `space-7`.
- `radius-sm` 8 em campos, `radius-md` 12 em botões e avisos, `radius-lg` 20 em painéis, cartões e diálogos, `radius-pill` em chips.
- Painéis no fluxo não têm sombra; separam-se por `line`. `shadow-raise` só no que flutua: **Menu, Dialog e Toast**.
- Sem borda colorida à esquerda em cartões e sem gradiente como fundo de painel.
- **Instituição e professor (desktop-first):** `SideNav` de 248px a partir de 1.024px, só ícones entre 768 e 1.024px, navegação inferior com até 5 destinos abaixo de 768px. Conteúdo com até 1.280px e margem `space-7`.
- **Aluno e família (mobile-first):** navegação inferior com até 5 destinos, margem lateral `space-4`.

## 6. Movimento

- `duration-fast` 160ms (hover, foco, aba), `duration-base` 240ms (abrir menu, salvar), `duration-slow` 420ms (diálogo e avanço do losango). `ease-out` em tudo que responde a uma ação; `ease-in-out` só na `Aurora`.
- `prefers-reduced-motion` e o kill-switch `[data-anim='off']` zeram transições e param a `Aurora` (`packages/ui/src/tokens/base.css`). Gamificação deve poder ser desligada pela pessoa.
- Sem entrada animada de seções ao rolar.

## 7. Componentes (`@notaa/ui`)

Button (e `ButtonLink`), TextField, Select, Chip (status), ChoiceChip (opção selecionável), Tabs, SideNav, GradeGrid, ProgressTrail, Notice, EmptyState, Aurora, Dialog, Toast e Menu, além dos primitivos anteriores (Card, Badge, Input, Table …), que serão migrados aos poucos. Ícones: `lucide-react`, traço de 2px, 20px na interface e 16px em chips; ícone sempre com texto, exceto botão só de ícone, que leva `aria-label`.

## 8. Acessibilidade e inclusão (checklist → testes)

- Foco de teclado: contorno sólido de 2px com 2px de folga, 3:1 sobre todas as superfícies.
- Alvo de toque mínimo de 44px (Button `md`, campos, itens de navegação no celular).
- Campos sempre com rótulo visível; erro ligado ao campo por `aria-describedby` e `aria-invalid`.
- Tabelas com cabeçalhos de linha e coluna (`scope`).
- Diálogo com foco preso, `Esc` e retorno de foco; avisos de status em `role="status"` (`role="alert"` para erro).
- Contraste verificado por teste: `packages/ui/src/tokens/contraste.test.ts` calcula os pares do README do handoff nos dois temas (4,5:1 para texto, 3:1 para borda de controle e foco).
- Componentes: Testing Library + `vitest-axe`. Telas: Playwright + `@axe-core/playwright` e Lighthouse (acessibilidade ≥ 95), em `apps/web/e2e`.
