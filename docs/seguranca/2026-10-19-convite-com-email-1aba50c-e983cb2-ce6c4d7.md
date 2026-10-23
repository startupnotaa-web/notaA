<!--
Relatório de revisão de segurança, recuperado das sessões do Claude Code deste projeto e guardado aqui SEM EDIÇÃO.
Gerado em: 2026-10-19 06:13 UTC (sessão 8d7b7b09). O texto abaixo da linha é o original; só este cabeçalho foi acrescentado.
Commits: 1aba50c, e983cb2, ce6c4d7.
-->

> **Origem:** Aceite do convite com e-mail, pendência e aprovação. Texto original, guardado em 23/10/2026 a partir da sessão `8d7b7b09`.

---

# Revisão de segurança: aceite do convite com e-mail, pendência e aprovação

**Escopo:** `28bc9c9..HEAD`, 3 commits (`1aba50c`, `e983cb2`, `ce6c4d7`). Li o diff e o código ao redor. Não executei nada nesta etapa.

## Resultado

**Nenhuma vulnerabilidade nova com confiança ≥ 8/10, de severidade alta ou média.**

A observação anterior ("token repassado a outra conta liga o contato") **sumiu**. O vínculo só nasce em dois casos:
- O e-mail da conta, vindo do claim assinado do token, é igual ao do contato.
- A gestão ou a coordenação aprova a pendência.

Em qualquer outro caso o contato fica sem `usuario_id` e sem consentimento. São esses dois campos que `auth_alunos_do_responsavel()` e a view `aluno_do_responsavel` exigem, então a conta que pediu não lê nada.

## Superfície nova revisada

* **`aceitarConvite`.**
  * O papel e o status `ativo` são conferidos no banco, não no JWT.
  * O uso único é um `UPDATE` condicional atômico.
  * O contato é lido já filtrado por instituição e por `usuario_id IS NULL`.
  * A divergência grava a pendência e a auditoria, faz o commit e só então responde `CONVITE_INVALIDO`. A resposta é a mesma de token inexistente, usado, expirado ou revogado (404, mesma mensagem), sem dado de aluno.
  * Conta inativa ou fora do papel recebe `FORA_DO_ESCOPO` antes de o token ser consumido, e não cria pendência.
* **Comparação de e-mail.** Usa `req.user.email`, que é o claim assinado. O `usuario.email` fica de fora porque o cadastro grava o e-mail do corpo da requisição. Sem claim, o resultado é divergência. Qualquer erro de normalização cai para o lado seguro: vira pendência, não vínculo.
* **`GET /instituicao/vinculos-responsavel/pendentes`, `POST .../:id/aprovar` e `.../:id/recusar`.**
  * A instituição vem do banco pelo `sub`, e todas as consultas filtram por `instituicao_id`. Id de outra instituição, inexistente ou já decidido dá o mesmo 404.
  * A aprovação trava a linha com `FOR UPDATE`, que reavalia o filtro de status. Duas aprovações simultâneas dão uma vencedora.
  * Antes de ligar a conta, a aprovação revalida que quem pediu segue `responsavel` e `ativo`, e que o contato está livre (409 nos dois casos).
  * O consentimento gravado é o de quem pediu. A versão do termo e a hora vêm da solicitação, não do corpo nem do momento da aprovação.
  * `email_conta` é apagado na decisão, e a auditoria leva só ids.
  * A recusa é um `UPDATE` condicional e não liga nada.
* **Tabela `solicitacao_vinculo_responsavel` (0017).**
  * As FKs compostas amarram a solicitação à mesma instituição do contato e do convite.
  * Há no máximo uma pendência por contato (índice único parcial).
  * A RLS libera a leitura só para a administração da instituição. Quem fez a tentativa não lê a própria linha, o que preserva a resposta idêntica.
  * `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` estão revogados para `anon` e `authenticated`. Nada da view nem das funções de RLS mudou.
* **Rotas novas.** Estão em `ROUTE_ROLES` e no `@Roles('admin_instituicao')` do controller. A matriz de 403 confirma que nenhum outro papel entra.
* **Orientação na justificativa.** É só texto de ajuda no markup. Não há superfície nova.

## Observações abaixo do limiar

Não são achados. Registro para a decisão de vocês.

* **A garantia depende de "Confirm email" ligado no Supabase** (`convite-responsavel.service.ts`, `aceitarConvite`). O claim é assinado, mas só prova posse do e-mail se o projeto exigir confirmação. Se estiver desligado, quem se cadastrar com o e-mail do contato passa a comparação e vincula sem aprovação. Não tenho como ver essa configuração pelo repositório. Vale conferir em Authentication → Providers → Email.
* **`AuthService.register` grava em `usuario.email` o e-mail do corpo da requisição**, sem ligação com o token (`auth.service.ts`, `register`). Este diff não depende desse campo, justamente por isso. Outro código que tratar `usuario.email` como prova de identidade herda o problema. Já estava assim antes desta branch.
* **A coordenação vê o e-mail de quem pediu** e decide com base nele. Uma aprovação descuidada vincula a conta errada. O desenho já mostra o e-mail cadastrado ao lado, e o consentimento fica atribuído a quem pediu. A decisão fica registrada com o ator.
* **Quem usa um link repassado consome o token.** O responsável legítimo, ao chegar depois, só recebe "convite inválido" e a instituição precisa emitir outro. É consequência do uso único e do pedido de resposta idêntica. Fica fora do escopo da revisão porque seria negação de serviço.
