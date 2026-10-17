# Testes de interface (acessibilidade)

Dois conjuntos, ambos em Chromium real:

- `a11y.spec.ts`: axe (WCAG 2.0/2.1 A e AA, inclui contraste), sem rolagem horizontal da página, alvos de
  44px e foco visível, em **dois temas** e **três larguras** (1280, 900 e 390px). Cada aba das telas com
  abas é auditada.
- `lighthouse.spec.ts`: Lighthouse, categoria acessibilidade, meta ≥ 95, em desktop e celular, nos dois temas.

Rotas cobertas: `/instituicao`, `/instituicao/academico`, `/instituicao/importacao`, `/professor` (institucional
e independente), `/dashboard` (home do aluno) e `/` (landing).

## Modo simulado (padrão, sem credenciais)

A sessão é gravada no `localStorage` e as chamadas `fetch` são respondidas com dados tipados pelos contratos
(`fixtures.ts`). Nada fala com Supabase nem com a API.

```bash
# o app precisa estar compilado; qualquer valor serve nas variáveis públicas do Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=local pnpm --filter @notaa/web build
pnpm --filter @notaa/web exec playwright install chromium   # uma vez
pnpm --filter @notaa/web e2e
pnpm --filter @notaa/web e2e:lighthouse
```

`E2E_SHOTS=/pasta pnpm --filter @notaa/web e2e` grava uma captura de cada tela e tema.

## Modo conta real

Aponta para um ambiente já no ar e entra pelo formulário de login. As credenciais ficam só no seu ambiente,
nunca no repositório:

```bash
E2E_BASE_URL=https://seu-ambiente E2E_EMAIL=... E2E_SENHA=... E2E_PAPEL=admin_instituicao \
  pnpm --filter @notaa/web e2e
```

Só rodam as rotas do papel da conta (`E2E_PAPEL`, padrão `admin_instituicao`) e as públicas. Os textos que o
teste espera na tela (`espera`, em `a11y.spec.ts`) valem para dados normais; com a conta vazia, ajuste-os.
Este modo não foi executado contra um ambiente real ao ser escrito.
