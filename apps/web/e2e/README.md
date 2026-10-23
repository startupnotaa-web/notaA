# Testes de interface (acessibilidade)

Dois conjuntos, ambos em Chromium real:

- `a11y.spec.ts`: axe (WCAG 2.0/2.1 A e AA, inclui contraste), sem rolagem horizontal da página, alvos de
  44px e foco visível, em **dois temas** e **três larguras** (1280, 900 e 390px). Cada aba das telas com
  abas é auditada.
- `lighthouse.spec.ts`: Lighthouse, categoria acessibilidade, meta ≥ 95, em desktop e celular, nos dois temas.

Rotas cobertas (as públicas incluem `/aluno`, `/professores`, `/escola`, `/faculdade`, `/privacidade` e `/termos`): `/instituicao`, `/instituicao/academico`, `/instituicao/importacao`, `/professor` (institucional
e independente), `/dashboard` (home do aluno) e `/` (landing).

## Login por perfil

`login-por-perfil.spec.ts` cobre para onde cada conta vai depois de entrar (aluno, professor, coordenação,
responsável, admin da plataforma), o parâmetro `next` (inclusive vetores de open redirect), quem já está
logado em `/login`, o 403 de rota de outro perfil sem loop, `GET /me` falhando, o "Entrar como…" com mais de
um acesso (a interface envia o contexto; o servidor o valida) e conta inativa. Roda no modo simulado:

```bash
pnpm --filter @notaa/web exec playwright test e2e/login-por-perfil.spec.ts
```

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


## Páginas públicas (landing)

- `landing.spec.ts`: metadados (título, canonical, Open Graph), CSP com nonce sem nenhuma violação, o three fora do
  JS que carrega antes do `load`, os fallbacks do 3D (movimento reduzido, sem WebGL, aparelho com 4 núcleos ou menos),
  pausa da cena fora da viewport, os três formulários de lead (a API é simulada na rota) e o teclado. O WebGL roda por
  software (SwiftShader), configurado em `playwright.config.ts`.
- `capturas-landing.spec.ts`: grava as páginas em 390, 768, 1366 e 1920 px, com a cena 3D e com a arte estática:

```bash
E2E_SHOTS=../../design-handoff/landing-depois pnpm --filter @notaa/web exec playwright test e2e/capturas-landing.spec.ts
```

- `pnpm --filter @notaa/web verificar:bundle` (depois do build) falha se o `three` entrar no JS inicial de uma rota.
- `pnpm --filter @notaa/web og` regenera as imagens de compartilhamento em `public/og/` a partir dos tokens.
- O Lighthouse exige LCP de até 2,5 s nas páginas públicas.

Variáveis da landing: `NEXT_PUBLIC_API_URL` (destino do formulário), `NEXT_PUBLIC_SITE_URL` (canonical; padrão
`https://notaa.com.br`) e, na API, `LEAD_HASH_SALT` (segredo do limite de envios; sem ele o limite fica desligado) e
`LEAD_LIMITE_POR_HORA` (padrão 5).
