<!--
Relatório de revisão de segurança, recuperado das sessões do Claude Code deste projeto e guardado aqui SEM EDIÇÃO.
Gerado em: 2026-10-18 01:57 UTC (sessão 8d7b7b09). O texto abaixo da linha é o original; só este cabeçalho foi acrescentado.
Commits: 792a554, d4c4a34, cf81b25, 4fd25c4, 0a3e3ea, 9995467, 28bc9c9.
-->

> **Origem:** Correções da Gestão Acadêmica Fase 1. Texto original, guardado em 23/10/2026 a partir da sessão `8d7b7b09`.

---

# Revisão de segurança: correções da Gestão Acadêmica Fase 1

**Escopo:** `48199cc..HEAD`, 7 commits, do `792a554` ao `28bc9c9`. Li o diff e o código ao redor; não executei nada nesta etapa.

## Resultado

**Nenhuma vulnerabilidade nova com confiança ≥ 8/10, nem de severidade alta ou média.** Os 3 achados da revisão anterior sumiram. As observações abaixo ficaram abaixo do limiar e não são achados.

## Os 3 achados anteriores

| Achado anterior | Situação | Evidência |
|---|---|---|
| **Vuln 1.** Vínculo de responsável por e-mail, sem convite nem consentimento. | **Sumiu.** | `importacao.repository.ts` não consulta mais `usuario`. `alunos.ts` não tem `contasResponsavelPorEmail` nem `usuarioId`. Em `0016`, `auth_alunos_do_responsavel()` exige `consentimento_responsavel` da mesma conta. A cláusula do responsável saiu de `p_aluno_instituicao_leitura`, e ele lê só a view `aluno_do_responsavel`, sem `data_nascimento`, `email` nem `usuario_id`. A escrita na view está revogada. Os vínculos antigos foram zerados. |
| **Vuln 2.** PII em `audit_log` imutável, sem anonimização. | **Sumiu.** | Os eventos de responsável gravam só `importacaoId`, `responsavelAlunoId` e nomes de campo. `anonimizar_pii_audit_log()` limpou o que já existia. O bloqueio geral continua: só vale o `UPDATE` com o GUC local ligado pela função, em duas ações e só na coluna `dados`. `DELETE` e `TRUNCATE` seguem barrados. |
| **Vuln 3.** Períodos mudavam com regra ativa, sem auditoria e sem justificativa. | **Sumiu.** | `assertContagemCompativel` recusa criar e remover período com regra vigente (409). Toda escrita acadêmica grava `audit_log` na mesma transação. `criarRegra` e `ativarRegra` exigem justificativa de 15 a 500 caracteres no Zod e de novo no serviço. A reativação grava `reativacao` e `regraAnteriorId`. |

## Superfície nova revisada

* **`POST /instituicao/responsaveis/:id/convites`** (`convite-responsavel.service.ts`). A instituição vem do banco, pelo `sub` do token. O contato é filtrado por `instituicaoId`, então id de outra instituição devolve "não encontrado". O token tem 32 bytes de `randomBytes`, só o SHA-256 vai ao banco, e ele não entra na auditoria. Não há IDOR.
* **`POST /responsavel/convites/aceitar`.** O papel é conferido no banco (`tipoPerfil`), não no JWT. O `UPDATE` condicional (`usado_em IS NULL`, `revogado_em IS NULL`, `expira_em > now()`) é atômico, e o aceite roda numa transação única. Token inexistente, usado, expirado, revogado e consentimento duplicado dão a mesma resposta (`CONVITE_INVALIDO`, 404), sem dado de aluno. O corpo não aceita `instituicaoId`, `alunoId` nem `usuarioId`.
* **View `aluno_do_responsavel`.** `security_barrier` ligado e `REVOKE ALL` antes do `GRANT SELECT`, então ela não vira vetor de escrita que fure a RLS. O filtro vem do helper `SECURITY DEFINER`, que lê `auth.uid()` da sessão de quem consulta.
* **Trigger de `audit_log`.** O contorno exige GUC local, ação em lista fechada e `to_jsonb(NEW) - 'dados' = to_jsonb(OLD) - 'dados'`. `authenticated` e `anon` não têm `UPDATE` na tabela nem `EXECUTE` na função, e `set_config` não é alcançável por RPC do PostgREST.
* **`ArmazenamentoSupabase`.** O tamanho vem de `info()` antes do download, sem fallback silencioso quando o Storage não informa. Há conferência de novo depois de baixar.

## Observações abaixo do limiar

Não são achados. Registro para a decisão de vocês.

* **Token sem vínculo com o e-mail da conta** (`convite-responsavel.service.ts`, `aceitarConvite`). Quem tiver o link e uma conta de responsável liga a própria conta ao contato. É a decisão registrada no plano. Só é explorável com o token em mãos, que tem 256 bits, expira em 7 dias e vale uma vez. Se o link for repassado fora do canal pretendido, essa conta passa a ler nome, matrícula e turma do menor. Mitigação possível: exigir que o e-mail da conta bata com `responsavel_aluno.email`, ou confirmação pela secretaria.
* **Texto livre da justificativa na auditoria** (`academico.service.ts`, `criarRegra` e `ativarRegra`). Quem digita pode colocar nome de pessoa num log imutável. O helper de teste só procura e-mail e telefone. Mitigação possível: orientar na tela a não citar pessoas.
* **GUC de anonimização.** Quem executa SQL como superusuário e liga `notaa.anonimizando` à mão pode reescrever `dados` de `responsavel.vinculado` e `responsavel.atualizado`. Está documentado na migração e exige acesso que já burlaria a RLS.
* **`auth_current_usuario_id()` não olha `status`.** Foi deixada de fora de propósito, porque é compartilhada com as políticas das tabelas anteriores (`supabase/policies/0001`). Usuário suspenso ainda lê o que essas tabelas antigas liberam. O que existia antes da Fase 1 ficou fora deste diff.
* **RLS de `usuario` fora das migrações.** A proteção de `funcao_instituicao` contra `UPDATE` direto depende de `supabase/policies/0002` ter sido aplicada em produção. O teste prova o comportamento com o trecho extraído desse arquivo, mas a migração 0016 não garante que ele foi aplicado. Vale conferir no projeto Supabase real.
