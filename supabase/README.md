# Supabase

Schema versionado do Nota A — fonte de verdade é `packages/db/src/schema/` (Drizzle); este diretório recebe o **SQL gerado** e as **políticas RLS**, conforme `docs/09-estrutura-repositorio.md` §1.

## Projeto real

- **Nome:** `notaa` · **ref:** `rvxkpafwowzfvczpzgji` · **região:** `sa-east-1` (São Paulo, conforme doc 02) · **org:** `startupnotaa-web's Org`.
- **URL:** `https://rvxkpafwowzfvczpzgji.supabase.co`
- Painel: https://supabase.com/dashboard/project/rvxkpafwowzfvczpzgji
- Havia um projeto anterior (`startupnotaa-web's Project`, região `us-west-2`) — ficou órfão, não foi usado nem deletado.

## Estrutura

- `migrations/` — gerado por `pnpm --filter @notaa/db db:generate`. **Nunca editar manualmente**, exceto para acréscimos que o Drizzle não modela ainda (ex.: `CREATE EXTENSION`), já feito na `0000_equal_cerebro.sql` para `citext`.
- `migrations/meta/` — snapshots internos do drizzle-kit (controle de diff entre gerações). Não reformatar (`.prettierignore`).
- `policies/` — políticas RLS (`docs/10-seguranca-e-privacidade.md` §2), aplicadas **depois** das migrations.
  - `0001_rls_estudante.sql` — 1ª passada: tabelas de dado de estudante com `estudante_id` direto ou por join de 1 nível, mais o helper `auth_current_usuario_id()`.
  - `0002_rls_restante.sql` — 2ª passada: as 15 tabelas restantes (catálogos públicos, `usuario`, institucionais/internas travadas a service role).

## Estado atual

✅ As 37 tabelas do [doc 04](../docs/04-modelo-de-dados.md) — schema completo, **aplicado no projeto real**.
✅ RLS **habilitada nas 37/37 tabelas** (0 advisories críticos). 13 tabelas ficam intencionalmente sem `policy` de leitura (catálogo `banco_de_itens` com `gabarito`, institucionais sem RBAC ainda, governança interna) — acesso só via service role (API), por design (ver comentários em `0002_rls_restante.sql`).
✅ Hardening de segurança aplicado: extensão `citext` movida para schema `extensions` (fora de `public`); `auth_current_usuario_id()` com `EXECUTE` restrito a `authenticated` (revogado de `anon`/`public`).
⏳ **Pendências que só podem ser resolvidas no painel** (a API do Supabase MCP não expõe segredos por design): `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, senha do `DATABASE_URL`. Ver `apps/api/.env` para instruções exatas e os links diretos.
⏳ Avisos de performance (INFO) ainda abertos: alguns FKs sem índice de cobertura, índices "nunca usados" (esperado — banco vazio, 0 linhas). Não urgente; revisitar com volume real de dados.

## Como aplicar mudanças futuras de schema/RLS

```bash
# 1. Gerar nova migration a partir do schema Drizzle
pnpm --filter @notaa/db db:generate

# 2. Aplicar via Supabase MCP (apply_migration) ou psql direto:
psql "$DATABASE_URL" -f migrations/<novo_arquivo>.sql
```

Sempre rodar `get_advisors` (security + performance) depois de qualquer migration — é assim que pegamos os 2 itens de hardening acima.
