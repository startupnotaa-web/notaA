# Revisão de segurança: Fase A, login por perfil (`66d6c50`, `dfd35ec`, `fe8a60e`)

**Escopo:** os três commits da Fase A do PR #12. Os commits posteriores (`ddceadc`, `cb4de61`: acesso que sobrevive à recarga e "Concluir cadastro") entraram depois desta revisão e não estão cobertos por ela.
O skill foi lançado com o diff contra a `main` (1,7 MB, 264 arquivos). A análise foi feita sobre os arquivos da fase.

## Resultado: nenhuma vulnerabilidade com confiança ≥ 8

| Área | O que foi verificado | Conclusão |
|---|---|---|
| Redirecionamento aberto via `next` | `caminhoInternoSeguro` recusa `//`, `\`, esquemas e caracteres de controle, decodifica `%` uma vez, resolve como o navegador e exige a origem interna. `resolverDestino` ainda exige que o papel tenha permissão na rota; rota desconhecida é negada. `auth/confirm` passou a usar a mesma função. | Fechado. 30 vetores nos testes. |
| Escalada de privilégio por `x-contexto` | `ContextoGuard` usa o papel do JWT verificado, não o do cabeçalho; revalida os vínculos reais a cada requisição; rejeita papel diferente, formato inválido e cabeçalho repetido. `request.contexto` não amplia permissão: nenhum serviço o lê. | Sem exploração. |
| Papel lido de `user_metadata` | O cliente só lê `app_metadata.papel` (escrito apenas pela service role). As guardas web são de experiência; a API autoriza. | Inalterado e seguro. |
| Lista de contextos | A consulta parte do `sub` do token, sem id do cliente; só vínculos ativos. | Sem IDOR. |
| Auditoria da troca | `dados` só com UUIDs e enum já validados; `instituicao_id` nulo (a gestão não lê); `de` só se ainda válido. | Sem dado pessoal. |
| `UsuarioAtivoGuard` | Falha fechada para `suspenso` e `pendente`; rotas públicas pulam; cache de 30 s (atraso documentado). Conta sem linha em `usuario` passa, mas o JWT só traz papel depois de a linha existir (escrito só pela service role). | Aceitável. |
| CORS | Só `x-contexto` acrescentado a `allowedHeaders`. | Sem mudança de origem permitida. |
| Armazenamento no cliente | `localStorage` guarda só `{authUid, contexto}` como dica, atrelado à conta, apagado ao sair e revalidado no servidor. Nenhum token. | Seguro. |
| Telas novas | Nenhum `dangerouslySetInnerHTML` nem URL externa não validada. | Sem XSS. |
