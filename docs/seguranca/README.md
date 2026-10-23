# Revisões de segurança

Relatórios das revisões de segurança deste repositório, guardados aqui para que o que a migração 0016 cita (“Correções da revisão de segurança da Gestão Acadêmica, Fase 1 (2026-10-17)”) esteja no repositório e não só numa conversa.

Os seis primeiros foram **recuperados das sessões do Claude Code** em que foram gerados e guardados sem edição (só um cabeçalho de origem foi acrescentado). Cada um declara o próprio escopo e o que deixou de ler; leia o escopo antes de tirar conclusões.

| Data (UTC) | Arquivo | Commits | Resultado |
|---|---|---|---|
| 2026-10-17 05:08 | [design-system](2026-10-17-design-system-824df2e-48199cc.md) | `824df2e`, `cedf635`, `ed4e236`, `d7ce8c8`, `a271d18`, `48199cc` | Nenhum achado alto ou médio |
| 2026-10-17 06:11 | [gestao-academica-fase1](2026-10-17-gestao-academica-fase1.md) — **o citado pela 0016** | `24a8d79`, `3f8deec`, `af8fb83`, `8680b8f`, `6ee836c`, `cacf9cd`, `996f486` | 3 achados médios: vínculo de responsável por e-mail, dado pessoal no `audit_log`, período editável com regra ativa |
| 2026-10-18 01:57 | [correcoes](2026-10-18-correcoes-gestao-academica-792a554-28bc9c9.md) | `792a554`, `d4c4a34`, `cf81b25`, `4fd25c4`, `0a3e3ea`, `9995467`, `28bc9c9` | Os 3 achados corrigidos; nada novo |
| 2026-10-19 06:13 | [convite-com-email](2026-10-19-convite-com-email-1aba50c-e983cb2-ce6c4d7.md) | `1aba50c`, `e983cb2`, `ce6c4d7` | Nada novo |
| 2026-10-19 14:47 | [branch fix/seguranca](2026-10-19-branch-fix-seguranca-vinculo-responsavel.md) | até `469f495` (0017, convite, vínculo) | Nenhum achado nos arquivos lidos; **não leu** as migrações 0015 e 0016 |
| 2026-10-19 16:49 | [fase 2](2026-10-19-fase2-ce6c4d7-03386e0-b81603d.md) | `ce6c4d7`, `03386e0`, `b81603d` | Nenhuma vulnerabilidade com confiança ≥ 8 |
| 2026-10-22 | [login por perfil, fase A](2026-10-22-login-por-perfil-fase-a.md) | `66d6c50`, `dfd35ec`, `fe8a60e` | Nenhum achado com confiança ≥ 8 |
| 2026-10-22 | [login leve](2026-10-22-login-leve-c24da66-04c7366.md) | `04c7366`, `c24da66` | Nenhum achado com confiança ≥ 8 |

## O que NÃO foi revisado em segurança

Os commits abaixo da refatoração visual não têm revisão registrada (são interface, sem lógica de autenticação nem de dados, mas não foram lidos com esse olhar):
`2fa4af7`, `205a6ac`, `d3b16c0`, `9e9324c`, `2d3be24`, `a6c58fa`, `4bbda79`, `ca57ce5`, `7b8e312`, `eb61406`, `190fab7`, `984c61f`, `546909c`, `d3bbb86`, `c85cf86`, `7300d45`, `52ff323`, `8eeba08`, `e171ab5`, `a25e5c3`, `05cc0e4`, `ae5b7f6`, `9863ed8`, e os de captura e teste de interface `82f86d3` e `f082177`.

Também não passaram por revisão: `ddceadc` e `cb4de61` (acesso que sobrevive à recarga; "Concluir cadastro" e `garantirRegistro` devolvendo o erro).

## Limites

- Os relatórios são análise de leitura de código; os que dizem “não executei nada” não executaram testes.
- Uma revisão depende do diff que recebeu. Mais de uma vez o diff entregue ao skill foi o da branch inteira e não o do escopo pedido; os relatórios declaram como o escopo foi refeito.
