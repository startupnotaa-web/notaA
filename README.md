# Nota A

Plataforma de preparação para o ENEM com quiz adaptativo, correção de redação, tutor com IA e gestão acadêmica.

## Onde fica cada parte

| Diretório             | Conteúdo                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`            | PWA em Next.js. Rotas em `app/`, componentes compartilhados em `app/components/`, lógica em `lib/` e testes de navegador em `e2e/`.              |
| `apps/api`            | API NestJS. Funcionalidades agrupadas por domínio em `src/modules/`, inicialização local em `src/main.ts` e entrada da Vercel em `api/index.ts`. |
| `apps/worker`         | Processo que consome a fila de importações acadêmicas.                                                                                           |
| `packages/contracts`  | Schemas Zod, tipos e interfaces compartilhadas.                                                                                                  |
| `packages/db`         | Schema Drizzle e acesso a dados.                                                                                                                 |
| `packages/ui`         | Componentes, tokens e recursos de marca.                                                                                                         |
| `packages/engines`    | Motores de TRI, perfil cognitivo, detecção de erros e avaliação acadêmica.                                                                       |
| `packages/importacao` | Leitura e validação de arquivos de importação acadêmica.                                                                                         |
| `packages/prompts`    | Prompts do tutor e do corretor.                                                                                                                  |
| `supabase`            | Migrações versionadas e políticas de acesso ao banco.                                                                                            |
| `scripts`             | Verificações compartilhadas do repositório.                                                                                                      |

## Desenvolvimento local

Use Node.js 20 ou superior e pnpm 9.15.9.

```bash
pnpm install
pnpm --filter @notaa/web dev
pnpm --filter @notaa/api dev
```

Execute web e API em terminais diferentes. O frontend roda normalmente na porta 3000 e a API na 3001. Para a web, configure `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `apps/web/.env.local`. A API carrega a configuração local de `apps/api/.env`. Para processar importações, execute `pnpm --filter @notaa/worker dev` com `DATABASE_URL`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente do worker.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Documentação

- [Produto](docs/01-entendimento-produto.md), [arquitetura](docs/03-arquitetura.md) e [perfis de acesso](docs/perfis.md).
- [Mapa das pastas internas](docs/09-estrutura-repositorio.md) e [levantamento de bugs e melhorias](docs/future.md).
- [Banco e migrações](supabase/README.md) e [testes de navegador](apps/web/e2e/README.md).
