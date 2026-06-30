# 07 — Design System & Inclusão

> Tokens da marca (paleta extraída da logo) + tipografia, espaçamento, raio, elevação e movimento, **como variáveis CSS** (não valores soltos). Tema **escuro é o default**; tema claro acessível também é entregue. Acessibilidade é **requisito**, não enfeite.

---

## 1. Princípios

1. **Escuro por padrão** — combina com a logo e o público jovem; claro disponível e acessível.
2. **Gradiente com moderação** — azul→magenta só em destaques (CTA principal, barra de XP, conquistas, headers de seção). Nunca em texto longo ou fundos amplos.
3. **Inclusão na base** — contraste WCAG AA, `prefers-reduced-motion` + kill-switch de animação, tipografia legível, nunca informação só por cor.
4. **Tokens primeiro** — toda cor/medida vem de variável; trocar tema = trocar tokens.

## 2. Tokens de cor (paleta da marca)

```css
:root {
  /* Gradiente da marca (135°) */
  --brand-grad-1: #1c9fe7;
  --brand-grad-2: #2e92e8;
  --brand-grad-3: #5878e9;
  --brand-grad-4: #8c54e3;
  --brand-grad-5: #9b42df;
  --brand-grad-6: #d31fe2;
  --gradient-brand: linear-gradient(
    135deg,
    #1c9fe7 0%,
    #2e92e8 18%,
    #5878e9 38%,
    #8c54e3 58%,
    #9b42df 78%,
    #d31fe2 100%
  );

  /* Sólidas derivadas */
  --brand-primary: #2699e9; /* azul */
  --brand-secondary: #7b4fe0; /* roxo */
  --brand-accent: #d022e3; /* magenta */
  --brand-tassel: #4b86fe; /* azul vivo */

  /* Fundos (tema escuro = default) */
  --bg-splash: #000000; /* splash/onboarding */
  --bg-base: #080e32; /* fundo do app */
  --bg-surface: #0c0a49; /* cards/superfícies */
  --bg-surface-2: #310a62; /* superfície de destaque */
  --bg-deep-purple: #41014d;

  /* Semânticos (escuro) */
  --color-bg: var(--bg-base);
  --color-surface: var(--bg-surface);
  --color-text: #f4f6ff;
  --color-text-muted: #aeb6e0;
  --color-border: #2a2f66;
  --color-primary: var(--brand-secondary); /* botão padrão = roxo (ver §8 contraste) */
  --color-on-primary: #ffffff;
  --color-focus: #8fc4ff;

  /* Estado (acessíveis sobre escuro) */
  --color-success: #3ddc97;
  --color-warning: #ffc24b;
  --color-error: #ff6b6b;
  --color-info: #5ab0ff;
}

[data-theme='light'] {
  --color-bg: #f7f8fc;
  --color-surface: #ffffff;
  --color-text: #10142e;
  --color-text-muted: #4a4f73;
  --color-border: #dce0f0;
  --color-on-primary: #ffffff;
  --color-focus: #1c5fb8;
  /* gradiente e cores de marca permanecem; revalidar contraste no claro */
}
```

## 3. Uso do gradiente e da logo

**Gradiente (`--gradient-brand`)** — permitido em: CTA primário, barra/ganho de XP, estados de conquista, headers de seção, anéis de progresso. **Proibido em:** texto de leitura, grandes áreas de fundo, fundo de formulário.

**Logo** (capelo em "A", gradiente azul→magenta + tassel azul):

- Aparece em **splash**, **header do App Shell** e **landing**.
- **Clear space** ≥ altura do tassel ao redor; **tamanho mínimo** 24px (mark) / 96px (logo+wordmark).
- **Não:** recolorir fora da paleta, distorcer, aplicar sobre fundo de baixo contraste, adicionar sombra dura.
- **Assets a extrair de `2.png`** (fundo preto facilita recorte) — _tarefa de scaffolding, doc 09_: `logo-mark.svg`, `logo-full.svg`, `logo-mono-white.svg`, `favicon.ico`, `icon-192/512.png`, `maskable-icon.png` (PWA), `splash.png`. Organizar em `apps/web/public/brand/`.

## 4. Tipografia

```css
:root {
  --font-sans:
    'Lexend', system-ui, -apple-system, sans-serif; /* legibilidade comprovada; bom p/ neurodivergência */
  --font-dyslexia:
    'Atkinson Hyperlegible', var(--font-sans); /* modo opcional, ativável pelo usuário */
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --fs-xs: 0.75rem;
  --fs-sm: 0.875rem;
  --fs-base: 1rem;
  --fs-lg: 1.125rem;
  --fs-xl: 1.375rem;
  --fs-2xl: 1.75rem;
  --fs-3xl: 2.25rem;
  --lh-body: 1.6;
  --lh-heading: 1.25; /* entrelinha generosa (apoio à dislexia) */
  --ls-body: 0.01em;
  --ls-heading: 0; /* leve espaçamento entre letras */
}
```

- Corpo ≥ **16px**; entrelinha **1.6**; largura de leitura **≤ 70ch**.
- **Modo dislexia** (toggle): troca `--font-sans`→`--font-dyslexia` e aumenta `--ls-body`.
- Hierarquia por **peso + tamanho**, nunca só por cor.

## 5. Espaçamento, raio e elevação

```css
:root {
  /* Espaçamento base 4px */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Raio */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Elevação (sutil no escuro) + brilho de marca p/ destaque */
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-2: 0 4px 12px rgba(0, 0, 0, 0.45);
  --glow-brand: 0 0 24px rgba(208, 34, 227, 0.35); /* só em elementos de destaque */
}
```

- **Alvos de toque ≥ 44×44px** (mobile-first; apoio motor/TDAH).
- Densidade confortável: respiro generoso reduz sobrecarga cognitiva.

## 6. Movimento (gamificação desativável)

```css
:root {
  --motion-fast: 120ms;
  --motion-base: 220ms;
  --motion-slow: 420ms;
  --easing: cubic-bezier(0.2, 0.7, 0.2, 1);
}

/* Respeito ao SO */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
/* Kill-switch global do usuário (essencial p/ público neurodivergente) */
[data-anim='off'] * {
  animation: none !important;
  transition: none !important;
}
```

- Animações de XP/conquista/streak **devem** desligar via `prefers-reduced-motion` **e** via toggle no app (`data-anim="off"`).
- Sem flashes (>3/s) — segurança fotossensível.

## 7. Acessibilidade & inclusão (checklist → vira teste/CI)

- [ ] Contraste **WCAG AA** (texto normal ≥ 4.5:1; grande/UI ≥ 3:1) — ver §8.
- [ ] `prefers-reduced-motion` **e** kill-switch global respeitados.
- [ ] Foco visível (`--color-focus`) em todo elemento interativo; navegação 100% por teclado.
- [ ] Nenhuma informação transmitida **só** por cor (usar ícone/rótulo/forma também).
- [ ] Alvos de toque ≥ 44px; textos redimensionáveis até 200% sem quebra.
- [ ] Componentes acessíveis por base (Radix/shadcn): ARIA, roles, labels.
- [ ] Modo dislexia (fonte + espaçamento) e opção de **reduzir gamificação/pressão** (streak sem punição desproporcional — fonte 4.1).
- [ ] Copy clara e curta (apoio TDAH); evitar parede de texto.

## 8. Verificação de contraste (valores calculados)

Razões de contraste sobre o fundo do app `--bg-base #080E32` (luminância ≈ 0.006):

| Par                                                 | Razão   | Texto normal (≥4.5) | Grande/UI (≥3.0) |
| --------------------------------------------------- | ------- | ------------------- | ---------------- |
| `#F4F6FF` texto sobre `#080E32`                     | ~18.5:1 | ✅                  | ✅               |
| `#AEB6E0` muted sobre `#080E32`                     | ~9.5:1  | ✅                  | ✅               |
| `#2699E9` (primário) como **texto** sobre `#080E32` | ~6.1:1  | ✅                  | ✅               |
| `#7B4FE0` (roxo) como **texto** sobre `#080E32`     | ~3.6:1  | ❌                  | ✅               |
| `#D022E3` (magenta) como **texto** sobre `#080E32`  | ~4.5:1  | ⚠️ limite           | ✅               |

Texto **sobre superfícies de botão** (qual cor de texto usar):

| Botão (fundo)                | Texto branco   | Texto preto | Regra                                                   |
| ---------------------------- | -------------- | ----------- | ------------------------------------------------------- |
| `#7B4FE0` roxo               | **~5.2:1 ✅**  | —           | **Botão padrão**: branco sobre roxo (passa AA normal).  |
| `#2699E9` azul               | ~3.1:1 ⚠️      | ~6.8:1 ✅   | Branco só em **texto grande/bold**; senão texto escuro. |
| `#D022E3` magenta            | ~4.2:1 ⚠️      | —           | Branco só em **texto grande/bold**.                     |
| Gradiente azul→magenta (CTA) | grande/bold ✅ | —           | **CTA usa texto ≥18.66px bold (ou ≥24px)** + branco.    |

**Regras práticas derivadas:**

- **Botão padrão = roxo `#7B4FE0` + texto branco** (único sólido que passa AA normal com branco).
- **CTA com gradiente**: texto sempre **grande e bold** + branco (confirmado por contraste).
- **Azul/magenta como texto** pequeno: evitar sobre fundo escuro; reservar para títulos/ícones grandes.
- Revalidar todos os pares no **tema claro** antes do release (ferramenta automatizada no CI).

> Os valores acima são calculados a partir da paleta; **um teste automatizado de contraste** (axe/Pa11y) entra no CI como guardrail (doc 08).
