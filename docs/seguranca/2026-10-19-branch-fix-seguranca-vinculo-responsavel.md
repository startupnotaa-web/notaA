<!--
Relatório de revisão de segurança, recuperado das sessões do Claude Code deste projeto e guardado aqui SEM EDIÇÃO.
Gerado em: 2026-10-19 14:47 UTC (sessão db771cf0). O texto abaixo da linha é o original; só este cabeçalho foi acrescentado.
Commits: até 469f495 (migração 0017 e serviços de convite e vínculo).
-->

> **Origem:** Branch fix/seguranca-gestao-academica-fase1 (lida no worktree, não no diff recebido). Texto original, guardado em 23/10/2026 a partir da sessão `db771cf0`.

---

# Revisão de segurança: branch `fix/seguranca-gestao-academica-fase1`

## Escopo e limites

- **O diff que recebi não é o desta branch.** O bloco "DIFF CONTENT" foi gerado no repositório principal, em `feat/visual-leve`, e traz commits de visual e web (`c24da66`, `4bbda79`, etc.) que não estão no PR. Por isso, a revisão foi feita lendo os arquivos do worktree `/Users/davi/Projects/notaa novo/notaA-vinculo`, que está em `469f495`.
- **Arquivos lidos:** `convite-responsavel.service.ts`, `vinculo-responsavel.service.ts`, os dois controllers, `supabase/migrations/0017_vinculo_responsavel_pendente.sql` e a parte de `rbac.ts` que cobre as rotas novas.
- **Não lidos nesta passada:** `0015` e `0016` (RLS e funções que a 0017 pressupõe), `auth_instituicao_admin()`, `EscopoService.funcaoNaInstituicao` e o restante do diff (web, importação, contratos). Não tenho confiança sobre esses trechos.

## Achados

Nenhum achado de severidade média ou alta com confiança ≥ 8 nos arquivos lidos.

## Pontos verificados e considerados seguros

1. **Identidade do aceite.** `aceitarConvite` usa `req.user.email`, que vem do JWT verificado pelo guard. O e-mail digitado no cadastro (`usuario.email`) não entra na decisão. O `body` não traz `usuarioId`, `instituicaoId` nem e-mail.
2. **Uso único do token.** O `UPDATE ... WHERE usado_em IS NULL AND revogado_em IS NULL AND expira_em > now()` é atômico. Quem perde a corrida recebe `CONVITE_INVALIDO`.
3. **Divergência não vincula.** O ramo `pendente` não grava `responsavel_aluno.usuario_id` nem `consentimento_responsavel`. Ele só consome o token e insere a solicitação, e a resposta é lançada depois do commit, como `CONVITE_INVALIDO`, então não há diferença observável para o token inexistente.
4. **Resposta uniforme.** Token inexistente, usado, expirado, revogado, contato já vinculado e divergência saem com o mesmo `NotFoundException` e o mesmo corpo. Não há vazamento de nome, e-mail ou existência do aluno.
5. **Aprovação.** `aprovar` trava a linha com `FOR UPDATE`, confere `status = 'pendente_aprovacao'` e a instituição do banco, e confere que o solicitante ainda é `responsavel` ativo. O consentimento é gravado com o `usuarioId` de quem pediu, nunca com o de quem aprova. O `UPDATE ... WHERE usuario_id IS NULL` evita sobrescrever um vínculo existente.
6. **Escopo por instituição.** `aprovar` e `recusar` filtram por `instituicao_id` vindo de `funcaoNaInstituicao`. Id de outra instituição devolve `NAO_ENCONTRADO`, sem diferença para id inexistente.
7. **Papéis.** As rotas novas estão em `ROUTE_ROLES` (`rbac.ts:211-213`) como `admin_instituicao`, e `roles-guard-matriz` e `route-roles-sync` cobrem as rotas. Responsável, aluno e professor recebem 403.
8. **Migração 0017.** `solicitacao_vinculo_responsavel` tem RLS habilitado, `SELECT` restrito a `auth_instituicao_admin()` por `instituicao_id`, e `REVOKE INSERT, UPDATE, DELETE, TRUNCATE` para `anon` e `authenticated`. Quem fez a tentativa não lê a própria linha, então não descobre que virou pendência. Os testes de privilégio em `funcao-e-privilegios.test.ts` cobrem a tabela.
9. **PII no audit_log.** Os eventos `responsavel.vinculo_pendente`, `responsavel.vinculo_aprovado`, `responsavel.vinculo_recusado` e `responsavel.aceitou_convite` gravam só ids, `versaoTermo` e `conviteId`. `acharPiiNoAuditLog` cobre essa regra nos testes.

## Ressalvas (não são achados)

- `solicitacao_vinculo_responsavel.email_conta` guarda o e-mail da conta em texto enquanto a pendência está aberta. A limpeza ao decidir existe, mas uma pendência que nunca é decidida mantém o e-mail indefinidamente. Isso é dado pessoal, não credencial, e não é vulnerabilidade explorável. Vale registrar como item de retenção.
- A segurança do vínculo por e-mail depende de o Supabase Auth exigir confirmação de e-mail. Sem isso, `req.user.email` é só o que a pessoa informou no cadastro. A migração 0017 já avisa isso, mas é uma configuração fora do código.

**Conclusão:** nenhum achado de severidade média ou alta confirmado nos arquivos revisados. Para fechar a revisão do PR inteiro, é preciso rodar de novo com o intervalo `main...fix/seguranca-gestao-academica-fase1` (ou os arquivos de 0015, 0016 e `EscopoService`), porque esta passada não cobriu essas partes.
