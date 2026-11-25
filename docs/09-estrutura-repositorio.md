# 09 — Estrutura do repositório

Este mapa acompanha o código do Nota A. O [README](../README.md) reúne os comandos de desenvolvimento e o [roadmap](08-backlog-e-roadmap.md) registra o planejamento do produto.

## 1. Onde encontrar cada parte

| Local                         | Organização                                                                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/`               | Rotas e layouts do Next.js por ambiente. Componentes exclusivos ficam junto da rota. Use `components/` quando a rota agrupa vários componentes. A implementação das páginas públicas compartilhada entre ambientes fica em `_landing/`. |
| `apps/web/app/components/`    | Acesso, estrutura das telas, navegação, feedback e gestão de painéis.                                                                                                                                                                   |
| `apps/web/lib/`               | Autenticação, contexto de acesso, navegador, HTTP e páginas públicas.                                                                                                                                                                   |
| `apps/api/src/modules/`       | Módulos NestJS de identidade, gestão acadêmica, aprendizagem, engajamento e plataforma. Cada funcionalidade concentra seus controllers, serviços e adaptadores.                                                                         |
| `apps/api/src/common/`        | Guards, decorators, filtros e pipes compartilhados.                                                                                                                                                                                     |
| `apps/worker/src/`            | Processamento assíncrono da fila de importações acadêmicas.                                                                                                                                                                             |
| `packages/contracts/src/`     | Schemas e tipos por domínio. Os contratos transversais ficam na raiz do pacote.                                                                                                                                                         |
| `packages/db/src/`            | Schema e repositórios por domínio. Os pontos de entrada ficam em `schema/index.ts` e `repositories/index.ts`.                                                                                                                           |
| `packages/engines/`           | Motores de TRI, perfil cognitivo, detecção de erros e avaliação acadêmica.                                                                                                                                                              |
| `packages/ui/src/components/` | Formulários, navegação, feedback, estrutura e marca. Tokens e recursos de marca ficam no próprio pacote de UI.                                                                                                                          |
| `packages/importacao/src/`    | Leitura de arquivos em `leitura/` e interpretação de campos em `validacao/`.                                                                                                                                                            |
| `packages/prompts/src/`       | Prompts versionados usados pela API.                                                                                                                                                                                                    |
| `supabase/`                   | Migrações, políticas e correções manuais do catálogo. [Guia do banco](../supabase/README.md).                                                                                                                                           |

## 2. Fronteiras entre camadas

- A web usa os pacotes compartilhados de UI e contratos. O acesso a dados e a IA passam pela API.
- Os módulos NestJS orquestram os casos de uso. O SDK de IA fica nos provedores em `apps/api/src/modules/plataforma/ai/`.
- Os motores implementam lógica de domínio em TypeScript. Os adaptadores Drizzle ficam no pacote de banco ou no módulo da API que os usa.
- O worker usa os contratos, o banco e o pacote de importação para processar a fila.

## 3. Contratos e tipos compartilhados

Use os pontos de entrada `@notaa/*` para importar entre pacotes. Os schemas de API compartilhados pela web e pela API ficam em `packages/contracts`. Os tipos do schema Drizzle ficam em `packages/db`.

## 4. Ambiente e configurações

As variáveis públicas da web ficam em `apps/web/.env.local`. A API lê a configuração de `apps/api/.env` no desenvolvimento local, e o worker usa o ambiente do processo. As configurações compartilhadas do TypeScript e do ESLint ficam na raiz.

## 5. Onde ficam os testes

- Os testes HTTP que sobem a API inteira e seus auxiliares ficam em `apps/api/src/__tests__/`. Os testes de uma funcionalidade ficam no `__tests__/` do módulo.
- Os testes unitários da web ficam em `apps/web/lib/`. Os testes de navegador ficam em [`apps/web/e2e/`](../apps/web/e2e/README.md).
- Os pacotes mantêm seus testes junto do código ou no `__tests__/` correspondente. Os testes que precisam de PostgreSQL descartável usam o suporte em `packages/db/src/testing/`.

## 6. Migrações e catálogos

O Drizzle lê `packages/db/src/schema/index.ts` e grava migrações em `supabase/migrations/`. Mudanças de schema entram em novas migrações. As políticas ficam em `supabase/policies/`, e as correções manuais de questões têm instruções próprias em [`supabase/correcoes/`](../supabase/correcoes/README.md).
