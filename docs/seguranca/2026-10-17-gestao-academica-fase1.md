<!--
Relatório de revisão de segurança, recuperado das sessões do Claude Code deste projeto e guardado aqui SEM EDIÇÃO.
Gerado em: 2026-10-17 06:11 UTC (sessão 8d7b7b09). O texto abaixo da linha é o original; só este cabeçalho foi acrescentado.
Commits: 24a8d79, 3f8deec, af8fb83, 8680b8f, 6ee836c, cacf9cd, 996f486.
-->

> **Origem:** Gestão Acadêmica Fase 1 (a que a migração 0016 cita). Texto original, guardado em 23/10/2026 a partir da sessão `8d7b7b09`.

---

# Revisão de segurança: Gestão Acadêmica Fase 1

**Escopo:** commits `24a8d79`, `3f8deec`, `af8fb83`, `8680b8f`, `6ee836c`, `cacf9cd` e `996f486`. Os commits do design system ficaram de fora.

**Método:** li a migração 0015, as rotas, os serviços, o pacote de importação, o worker, o motor de notas e os testes existentes. **Não executei nenhum teste.** Onde digo "provado", a prova é o teste que já existe no repositório ou a leitura do código. Não corrigi nada.

## Resultado

Não encontrei vulnerabilidade de severidade alta. O que a Fase 1 prometia está implementado: isolamento por instituição, importação defensiva, exportação com escape de fórmula, regra avaliativa só como dado e histórico imutável. Os achados abaixo são lacunas de privacidade e de integridade.

## Achados

### Vuln 1: Vínculo automático de responsável por e-mail, sem confirmação: `packages/db/src/repositories/importacao.repository.ts:149-159`

* **Severidade:** Média (confiança 7/10)
* **Descrição:** `contasResponsavelPorEmail` busca em `usuario` toda conta com papel `responsavel` cujo e-mail apareça na planilha, **sem filtrar por instituição**. O resultado vira `responsavel_aluno.usuario_id` (`packages/importacao/src/alunos.ts:140` e `:240`). Na migração, a função `auth_alunos_do_responsavel()` (`0015:318-323`) e a política `p_aluno_instituicao_leitura` (`0015:392-397`) dão a essa conta leitura direta, via Supabase, do cadastro do menor. O cadastro tem nome, data de nascimento, e-mail, matrícula e turma. Não há convite, token, confirmação do responsável nem registro de consentimento. O teste de aceite (`aceite-importacao.test.ts:181-186`) transforma esse comportamento em requisito.
* **Cenário de exploração:** um e-mail digitado errado na planilha, ou uma linha de má-fé, liga o menor a uma conta de responsável sem relação com ele. Essa pessoa passa a ler os dados do menor pelo PostgREST. A linha pode referenciar o e-mail de um responsável de outra instituição, porque a busca é global.
* **Recomendação:**
  1. Importar o responsável só como contato e criar o vínculo com a conta por convite (token aleatório, expiração, uso único).
  2. Se o vínculo automático continuar, restringir às contas já ligadas àquela instituição e gravar o consentimento.
  3. Limitar o que o responsável lê por view, sem `data_nascimento` e `email` do aluno.

### Vuln 2: Dado pessoal em `audit_log` imutável, sem caminho de anonimização: `importacao.repository.ts:176-191` e `:240`; `0015_gestao_academica.sql:237-257`

* **Severidade:** Média (confiança 7/10)
* **Descrição:** `responsavel.vinculado` e `responsavel.atualizado` gravam e-mail, matrícula, `usuarioId` e, em `atualizado`, o registro anterior inteiro do responsável (nome, e-mail, telefone). O trigger bloqueia UPDATE, DELETE e TRUNCATE até para a service role. As FKs de `ator_id` e `instituicao_id` são `ON DELETE restrict`.
* **Cenário de exploração:** um pedido de eliminação ou anonimização de dados (LGPD) de um responsável ou de um menor não tem como ser atendido. O dado pessoal fica no log para sempre e impede também a exclusão da conta ou da instituição.
* **Recomendação:** gravar no log só identificadores, sem e-mail, telefone ou nome (a `antes` vai para fora do log). Alternativa: permitir uma função `SECURITY DEFINER` de anonimização que mexa só em `dados`, com registro próprio.

### Vuln 3: Períodos editáveis e removíveis com regra ativa, sem auditoria e sem justificativa: `apps/api/src/modules/academico/academico.service.ts:167-204`, `:407-514`

* **Severidade:** Média (confiança 8/10 nos fatos; o impacto é de integridade, não de vazamento)
* **Descrição:** o invariante "número de períodos igual ao regime da regra" só é conferido em `ativarRegra` (`:475-490`). `atualizarPeriodo` e `removerPeriodo` só checam se o ano está arquivado e **não consultam se há regra ativa**. Nenhuma das duas grava `audit_log` (nem `atualizarDisciplina`, `atribuirDisciplina` e `removerDisciplinaDaTurma`). `criarRegra` e `ativarRegra` não recebem justificativa. Reativar uma versão antiga é possível sem motivo, porque `ativarRegra` aceita qualquer versão e não pede justificativa.
* **Cenário de exploração:** um gestor ou uma coordenação apaga o 4º bimestre de uma regra bimestral vigente. A base de cálculo muda sem rastro. Depois, o cálculo de nota do período ficará sem onde cair.
* **Recomendação:**
  1. Recusar remoção e alteração de contagem de período quando houver regra ativa no ano.
  2. Auditar todas as escritas acadêmicas.
  3. Exigir `justificativa` (mínimo de caracteres) em `POST /academico/regras` e em `ativar`, gravada em `dados` do `audit_log`.
  4. Dar à versão "fechada" um estado explícito.

### Pontos de atenção (baixos, sem exploração direta)

* **Função padrão é a mais privilegiada.** `funcao ?? 'gestor'` (`escopo.service.ts:93`) e `coalesce(funcao_instituicao, 'gestor')` (`0015:295`). Hoje a coordenação é criada à mão, mas um futuro fluxo que esqueça de gravar a função cria um gestor (exporta dados e lê a auditoria). Preferir padrão `coordenacao` e gravar `gestor` explicitamente.
* **Escrita direta não revogada nas 6 tabelas comuns.** O `REVOKE INSERT/UPDATE/DELETE` (`0015:418-428`) vale só para `regra_avaliativa`, `regra_avaliativa_ativacao` e `audit_log`. Nas outras, a única barreira é a ausência de política de escrita. Está correto hoje; uma política criada por engano abriria a escrita. Revogar também nelas.
* **`ROUTE_ROLES` não é aplicada em runtime.** O `RolesGuard` lê só `@Roles`, e rota sem `@Roles` entra para qualquer papel autenticado (`roles.guard.ts:31`). As duas rotas novas estão cobertas pelo `@Roles` de classe, e as 24 entradas de `ROUTE_ROLES` batem com os métodos dos controllers. Não há teste que prove a paridade (ver abaixo).
* **`tamanhoBytes` do `POST /importacoes` é só informado pelo cliente.** O limite real vem do bucket (10 MB) e da checagem depois do download (`armazenamento.ts:45-50`), que baixa o arquivo inteiro antes de recusar. Isso é consumo de recurso, não risco de segurança.

## Por item pedido

**1. RLS.** As 9 tabelas novas têm RLS ligado e política de SELECT; nenhuma ficou sem política. Nenhuma tem política de escrita. Estão provados em `rls.academico.test.ts`: usuário de outra instituição (`gestorB`) não lê linha nenhuma (`:196-203`); aluno vinculado e responsável vinculado veem só o previsto; professor independente não lê nada; anônimo é barrado; e `INSERT` em `disciplina` e `UPDATE` em três tabelas falham ou afetam 0 linhas. As FKs compostas impedem ligar dado entre instituições (`:280-298`).

**2. Importação.**
* Limite de tamanho: 10 MB, no bucket e em `detectarFormato`.
* Limite de linhas: 5.000, e o teste confere 5.000 e 5.001.
* Tipo real: por magic bytes. Recusa PDF, executável, `.xls` e imagem com extensão trocada, e confere o XLSX entrada a entrada, com teto de descompactação medido pelo tamanho real (teste de zip bomb com cabeçalho mentindo).
* Escape de fórmula: `celulaSegura` cobre `= + - @ \t \r`, e o teste confirma o apóstrofo em `=HYPERLINK(...)`.
* Idempotência: a chave é `(instituicao_id, matricula)`, com `ON CONFLICT DO NOTHING`. As consultas e os UPDATEs filtram por `instituicaoId`. O teste prova 280 criados, depois 0 ao reimportar, e que turma de outra instituição com o mesmo nome é recusada.
* **Exceção:** a busca de conta de responsável por e-mail é global (Vuln 1).

**3. Regra avaliativa.**
* Não existe `eval`, `Function` nem execução de texto. A regra é um JSON validado por `RegraAvaliativaSchema` (union discriminada, frequência mínima de 75%) e interpretada por funções puras em `engines/grading`.
* O Zod valida o corpo no servidor. Os schemas descartam chave desconhecida (padrão do Zod), então `instituicaoId` no corpo é ignorado.
* O banco impede UPDATE, DELETE e TRUNCATE nas versões. Isso está provado em `rls.academico.test.ts:237-278`, até para o superusuário.
* **Exceção:** não há justificativa registrada, e períodos e disciplinas mudam sem auditoria (Vuln 3).

**4. RBAC.** Todas as rotas novas têm `@Roles('admin_instituicao')` de classe, e `regras/ativa` acrescenta `professor_institucional`. Todas resolvem a instituição **pelo banco, via `escopo.funcaoNaInstituicao(req.user.sub)`**, nunca pelo corpo ou pela query. O JWT carrega `app_metadata.instituicao_id`, mas o código de Fase 1 não o usa, o que é mais seguro. Id de outra instituição devolve "não encontrado". Exportar exige a função de gestor (`instituicaoDoGestor`, provado no teste da exportação).

**5. Convite de responsável.** **Não existe nesta fase.** `responsavel_aluno` é contato da secretaria, sem token, expiração ou uso único. O vínculo com a conta é por e-mail (Vuln 1). Não há rota que liste ou enumere alunos para responsável.

**6. Dados de menores.**
* Nenhuma rota nova dá ao papel `responsavel` acesso a dado cognitivo ou de neurodivergência. As rotas `TODOS_OS_PAPEIS` já existentes operam só sobre o `sub` de quem chama.
* As tabelas da Fase 1 não guardam esse tipo de dado.
* O que o responsável vinculado lê pelo RLS é o cadastro do menor (nome, nascimento, e-mail), sem registro de consentimento (Vuln 1).
* O PII de responsáveis no `audit_log` é a Vuln 2.

## Testes que faltam

**RLS (`rls.academico.test.ts`)**
1. **Aluno sem vínculo.** Aluno sem matrícula ativa, com matrícula `pendente` ou `cancelada`, e aluno matriculado na instituição B lendo a A. Hoje só há o aluno vinculado.
2. **Responsável sem vínculo.** Conta de responsável sem nenhuma linha em `responsavel_aluno`, e conta ligada a aluno da instituição B lendo a A.
3. **Escrita em todas as tabelas.** Laço de INSERT, UPDATE e DELETE nas 9 tabelas, por gestor, coordenação, professor, aluno, responsável e gestor de outra instituição. Hoje só há 3 UPDATEs e 1 INSERT, todos pelo gestor A.
4. **Usuário inativo.** Usuário com `status` diferente de `ativo` mantém ou perde a leitura (as funções `auth_*` não consultam `status`).
5. **Coluna nova.** `funcao_instituicao` não é alterável por `authenticated`.

**API e serviços**
6. **Isolamento entre instituições nas escritas.** `atualizarPeriodo`, `removerPeriodo`, `atualizarDisciplina`, `removerDisciplinaDaTurma`, `listarPeriodos` e `listarDisciplinasDaTurma` com id da instituição B. Hoje só `ativarRegra`, `listarRegras`, `atribuirDisciplina` e `obter` da importação são cobertos.
7. **Importação, estados e dono.** `arquivoEnviado`, `salvarMapeamento`, `previa` e `confirmar` com id de outra instituição.
8. **Mass assignment.** Corpo com `instituicaoId` extra em `criarPeriodo`, `criarDisciplina`, `criarRegra` e `criar` da importação, provando que é ignorado.
9. **Paridade RBAC.** Teste que percorra as rotas do Nest e compare cada uma com `ROUTE_ROLES`, e que falhe se uma rota autenticada ficar sem `@Roles`. Incluir o caso `estudante`, `professor_independente` e `responsavel` recebendo 403 em todas as rotas novas, e `professor_institucional` recebendo 403 em tudo menos `GET /academico/regras/ativa`.
10. **Coordenação.** Confirmar que importa e configura, mas não exporta e não lê `audit_log`.

**Importação**
11. **Mesma matrícula em duas instituições.** A importação na A não atualiza nem conflita com a matrícula igual na B (hoje o teste usa a B só para turma).
12. **Responsável de outra instituição.** E-mail de conta de responsável ligada a outra instituição, para documentar o comportamento escolhido (Vuln 1).
13. **XLSX adversarial.** Planilha com `xl/vbaProject.bin` dentro de um XLSX real do ExcelJS, e XLSX com bit de senha (`flags & 1`). O primeiro só tem teste com ZIP sintético, e o segundo não tem teste.
14. **CSV grande.** CSV de 10 MB + 1 byte pelo caminho do armazenamento (`baixar` lançando `ArquivoGrandeDemaisError`).
15. **Exportação, ida e volta.** Valores como `-5` e telefones começando com `+` exportam e reimportam iguais.

**Regra avaliativa e auditoria**
16. **Períodos com regra ativa.** Recusa de remover ou alterar a quantidade (quando for implementado, Vuln 3).
17. **Justificativa.** `criarRegra` e `ativarRegra` sem justificativa são recusadas, e com justificativa ela aparece em `audit_log` (quando for implementado).
18. **Reativação.** Reativar versão antiga gera `regra.ativada` com ator e motivo.
19. **Privacidade do log.** Nenhum `audit_log.dados` contém e-mail ou telefone de responsável (quando for corrigido, Vuln 2).
