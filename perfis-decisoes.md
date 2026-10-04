# Decisões consolidadas — estrutura de instituições, turmas e professores

Complemento de `perfis.md`. Registra as respostas às 24 perguntas de levantamento,
fechadas em 2026-10-01.

**Esta estrutura substitui** a decisão anterior (2026-09-28) de unificar os painéis
de professor e instituição em um só e ocultar professor/turma junto com a Arena.
Da lista de funcionalidades ocultas **sobra apenas a Arena**.

Termo obrigatório na plataforma: **instituição**. Nunca "escola", nem em texto, nem
em tela, nem em código, nem no banco.

## Papéis

Quatro papéis, uma conta por papel. Quem exerce dois papéis tem duas contas.

| Papel | Como entra | Cria turma? |
|---|---|---|
| Admin de instituição | cadastro próprio, e-mail e senha, e assina | sim, para seus professores |
| Professor institucional | convite por link gerado na tela pela instituição | não |
| Professor independente | cadastro próprio | sim, para si |
| Aluno | cadastro próprio, turma é opcional | não |

- O papel hoje chamado `gestor` passa a ser **admin de instituição**.
- O administrador da plataforma mantém o nome atual (`admin`) e segue separado.
- O papel de **responsável** fica intocado, como está hoje. Nada novo é construído
  para ele nesta etapa.

## Vínculo do aluno com a instituição

- O aluno **pode se vincular a várias instituições** ao mesmo tempo, e alterna
  entre elas por um seletor de contexto na interface.
- Por isso o vínculo do aluno com a instituição **deixa de ser uma coluna** no
  usuário e passa a ser **derivado das turmas** em que ele está aprovado.
- A coluna de instituição no usuário sobrevive apenas para **admin de instituição**
  e **professor institucional**.
- O aluno entra numa turma por código de convite e **não sai por conta própria**.
  Só professor ou admin de instituição removem.

## Turma

- Conceito único, com dono em **duas colunas mutuamente exclusivas**: instituição
  ou professor independente.
- **Turma sem professor não aceita aluno.** (Reescrita da regra "não existe turma
  sem professor", que conflitava com o fluxo de criação da instituição, onde a
  turma é criada antes de receber professores.)
- Vários professores por turma, vários alunos por turma, vários turmas por professor.
- Ao remover o único professor de uma turma, **arquivar a turma é alternativa
  válida** a exigir um substituto.
- Aprovação de solicitação de entrada: **professor da turma ou admin de instituição**.

## Ano letivo

- É um **rótulo global** da plataforma (ex.: "2026"), igual para todos.
- As **datas de início e fim são definidas por cada instituição**.
- Turmas de anos anteriores ficam arquivadas, somente leitura, histórico preservado.
- **O aluno insere código de convite a cada ano.** Não há migração automática de
  alunos entre anos letivos.

## Código de convite

- Um código por turma, **válido por uma semana**.
- Aluno atrasado ou que chega no meio do ano: a instituição **gera um código novo**
  para ele entrar.
- **Gerar um código novo invalida apenas o código anterior, nunca as matrículas.**
  Quem já está na turma não é afetado.

## Privacidade e consentimento

- O aluno **consente explicitamente** ao entrar em cada turma.
- Instituição e professor veem **apenas o que o aluno gerou depois da aprovação**
  naquela turma. Aluno em duas turmas aprovadas em datas diferentes é visto por
  uma janela distinta em cada uma.
- O que a instituição e o professor veem: **resultados e métricas**. Não veem
  conversas com o tutor socrático.
- **Redação é exceção e entra**, mas só na visão individual do aluno dentro do
  painel do professor: um bloco "Redações" com nota geral, nota por competência e
  o texto da redação.
- Permissões aplicadas **no servidor**, não apenas escondidas na interface.

## Renomeação de escola para instituição

- Vai até o banco: tabela, colunas, índices.
- **Risco verificado em 2026-10-01 por consulta ao banco de produção:** 11 usuários,
  todos estudantes ativos, nenhum com instituição preenchida; zero instituições,
  zero turmas, zero matrículas, zero vínculos de responsável. O segundo projeto
  Supabase está vazio. **Não há dado de instituição a migrar.**
- O valor de enumeração do **tipo de plano** é renomeado.
- O valor de enumeração do **escopo de ranking** fica parado, por pertencer à Arena,
  que está oculta.
- As migrações antigas não se reescreve. A renomeação entra como migração nova.

## Plano e pagamento

- Construir a estrutura **funcionando sem cobrança**, para testes.
- Limite de plano e plano gratuito **ainda em definição**. A verificação de limite
  fica concentrada num único ponto, para ser ligada depois sem espalhar mudança.

## Em aberto

**Sinal de risco socioemocional: decisão adiada pelo usuário em 2026-10-01.**
Fica congelado exatamente como está hoje até nova orientação. Resumo do que está
em jogo: a triagem determinística roda no tutor socrático e na redação; severidade
alta escalona gravando notificação para responsáveis e para os gestores da
instituição do aluno. Nenhuma rota expõe esse dado e nenhuma tela o lê, então o
canal está inerte. A decisão pendente é se a instituição continua nesse
escalonamento, sai dele, ou entra com consentimento próprio.

**Consequência técnica dessa pausa:** o notificador de cuidado resolve hoje a
instituição do aluno lendo a coluna no usuário, que esta estrutura transforma em
vínculo derivado das turmas. Enquanto a decisão não vier, o notificador preserva o
comportamento atual e passa a resolver a instituição pelas turmas aprovadas do
aluno, sem mudar quem é notificado nem o que é gravado.

---

## Estado da execução

**Passo 1 — renomeação de escola para instituição: CONCLUÍDA.** Código e banco.
Migração `0012_renomeia_escola_para_instituicao.sql` aplicada em 2026-10-01 e
conferida: tabela `instituicao` no lugar de `escola`, três colunas
`instituicao_id`, enums `tipo_perfil` e `plano_tipo` atualizados, 11 usuários
intactos.

**Passo 2 — modelo de dados: CONCLUÍDO.** Migração
`0013_estrutura_turmas_professores.sql` aplicada em 2026-10-02 e conferida no
banco: os seis valores de `tipo_perfil`, o enum `matricula_status`, as três
tabelas novas, as colunas de `turma` e de `matricula_turma`, e `instituicao_id`
aceitando nulo.

O que ela cria e muda:
- `tipo_perfil`: 'professor' se divide em `professor_institucional` e
  `professor_independente`.
- enum novo `matricula_status`: pendente, ativa, recusada, removida.
- `ano_letivo`: rótulo global da plataforma.
- `ano_letivo_periodo`: datas e arquivamento por dono (instituição OU professor
  independente, duas colunas com CHECK de exclusividade).
- `turma`: ganha `ano_letivo_id`, `professor_dono_id`, `codigo_convite`,
  `codigo_expira_em`, `arquivada`; perde `professor_id` e `periodo`;
  `instituicao_id` passa a aceitar nulo.
- `professor_turma`: vários professores por turma.
- `matricula_turma`: ganha `status`, `solicitado_em`, `consentimento_em`,
  `aprovado_em`, `aprovado_por`. `aprovado_em` é o início da janela de dados, e
  um CHECK garante que matrícula ativa sempre tem data de aprovação.

**Passo 3 — autorização no servidor: CONCLUÍDO.** Módulo `modules/escopo`.

- `escopo.regras.ts`: núcleo puro, sem HTTP nem banco, no mesmo espírito do
  `rbac.ts`. Decide quem cria turma, quem aprova matrícula, quando uma turma
  aceita aluno, se um código de convite ainda vale, e — o mais importante — a
  **janela de dados**: desde quando o dado de um aluno pode ser visto. 23 testes.
- `escopo.service.ts`: resolve escopo no banco usando essas regras. Instituição
  do usuário, turmas do professor, turmas da instituição, donos de turma, alunos
  visíveis com a janela de cada um. Falha com 403 em vez de devolver vazio, para
  não confundir "não existe" com "não é seu".
- A janela passou a ser aplicada de verdade no painel do professor: XP somado e
  taxa de acerto por área contam só o que veio depois da aprovação de cada aluno.

**Ressalva registrada:** a ofensiva (`streak.dias_consecutivos`) é estado atual,
sem histórico por data, então não há como recortá-la pela janela. Um aluno
aprovado hoje já aparece com a ofensiva que acumulou antes. Recortar isso exigiria
histórico diário de ofensiva, que não existe no modelo.

**Passo 4 — API de ano letivo, turma e convite: CONCLUÍDO.** 17 rotas novas,
todas em ROUTE_ROLES e cobertas pelo guard-rail de CI.

- `packages/contracts/src/turma.ts`: contratos Zod de ano letivo, turma, convite,
  matrícula e solicitações. `consentimento` é `z.literal(true)`, então o schema
  recusa entrada em turma sem consentimento explícito — a regra não depende de o
  serviço lembrar de checar.
- `modules/ano-letivo`: criar, listar e atualizar (datas e arquivamento). Rótulo
  global reaproveitado entre donos; período por dono.
- `modules/turma`: criar (já com código de convite), listar com contagens,
  renomear, arquivar, regenerar código, vincular e desvincular professor, listar
  e decidir solicitações (aprovar, recusar, remover aluno).
- `modules/turma` lado do aluno, sob `/me`: prévia do convite, entrar na turma,
  listar minhas turmas.
- `turma.codigo.ts`: código de 6 caracteres, alfabeto sem pares confundíveis
  (O/0, I/1, S/5, Z/2) porque é ditado em sala, e `randomInt` de criptografia em
  vez de `Math.random` — o código é a única credencial de entrada numa turma.

Decisões de implementação que valem registro:
- Professor independente entra como professor da própria turma na criação, na
  mesma transação. Instituição não: ela vincula depois, e até lá a turma não
  aceita aluno.
- Desvincular o último professor de turma ativa é recusado, com a mensagem
  apontando as duas saídas: vincular outro ou arquivar.
- Código inexistente e código expirado devolvem a MESMA mensagem, para não
  permitir sondar códigos de outras turmas.
- Aluno recusado ou removido pode pedir de novo: a linha é reaproveitada e a
  janela de dados recomeça na próxima aprovação.
- Remover aluno zera `aprovado_em`, o que fecha a janela: a turma deixa de ver o
  que ele produzir. A conta dele não é tocada.

**Passo 5 — gestão de professores pela instituição: feita no código, PENDENTE no
banco.** Migração: `supabase/migrations/0014_convite_professor.sql`.

- Tabela `convite_professor`: token, prazo, uso e revogação.
- `POST /instituicao/professores/convites` gera o convite; a tela monta o link
  com o token. `GET` lista os abertos, `DELETE` revoga.
- `GET /convite-professor/:token` e `POST /convite-professor/registrar` são
  PÚBLICOS, porque rodam antes de a conta existir. O que autoriza é o token;
  papel e instituição nunca vêm do corpo da requisição.
- `GET /instituicao/professores` lista o quadro e já diz, por professor, em quais
  turmas ele é o único — é o aviso que perfis.md pede na remoção, pronto para a
  tela usar.
- `DELETE /instituicao/professores/:id` recusa se alguma turma ativa ficaria sem
  professor, e tira apenas o vínculo: a conta do professor não é apagada.

Decisões de implementação:
- Token do convite é de 32 bytes aleatórios, não o código curto da turma: este é
  clicado, não ditado, e concede acesso institucional.
- Prazo de 14 dias. **Não está em perfis.md**, é escolha de engenharia: o link é
  credencial e precisa de validade, e duas semanas dão folga para montar o quadro.
- Convite inexistente, expirado, usado e revogado devolvem a MESMA recusa, para
  não permitir sondar tokens.
- O convite só é queimado quando a conta é de fato criada. Se a conta já existia,
  o convite segue aberto para a pessoa certa usar.
- Registro de professor institucional é um caminho separado do cadastro público,
  de propósito: o papel não está em `TipoPerfilPublicoSchema`, então ninguém se
  declara professor de uma instituição pelo formulário aberto.

**Passo 6 — visão geral da instituição: CONCLUÍDO.** Sem migração.

- `modules/desempenho`: métricas com janela de dados, extraídas do painel do
  professor e agora COMPARTILHADAS com o da instituição. A regra de privacidade
  mais sensível do produto passa a ter uma implementação só.
- `GET /instituicao/overview`: agregado da instituição mais indicadores por
  turma (alunos ativos, sem acesso há 7 dias, pendentes, média de XP, área mais
  frágil). O agregado é calculado sobre o conjunto de alunos, não somando turmas:
  aluno em duas turmas é uma pessoa, não duas.
- `GET /instituicao/alunos`: lista com busca por nome e filtro por turma. O
  filtro é validado contra o escopo — id de turma de outra instituição é
  recusado, não ignorado.
- `GET /instituicao/turmas/:id/desempenho`: deixou de ser stub. Admin acessa as
  turmas da instituição, professor só as em que leciona.
- Nenhum indicador por professor, de propósito: perfis.md proíbe comparativo
  entre professores, e a forma de não construir um é não entregar o dado.

**ACHADO GRAVE (2026-10-02): a suíte de testes conectava no banco de PRODUÇÃO.**

`import 'dotenv/config'` nos arquivos e2e carrega o `.env` do repositório, cujo
`DATABASE_URL` aponta para o projeto Supabase de produção. Rodar `pnpm test` lia
dados reais. Dois testes só passavam por causa disso (`GET /me` devolvendo 200 e
o detalhe de turma), o que era dependência silenciosa de ambiente, não cobertura.

- `app.e2e.test.ts` agora força `DATABASE_URL` para um host inexistente e está
  isolado. As duas asserções que dependiam de banco foram reescritas para provar
  o que esse arquivo cobre de fato: a barreira de papel.
- `vertical-slice.e2e.test.ts` **continua tocando produção** (apenas leituras).
  Cortar o banco lá troca 5 falhas de asserção por 8 falhas com timeout, sinal
  pior. O conserto certo é um Postgres descartável para essa suíte.

**Passo 7 — telas: quase tudo. Sem migração.**

- **Seção de turmas no perfil do aluno** (`(estudante)/perfil/MinhasTurmas.tsx`).
  Duas etapas: digita o código, confere nome da turma e de quem é, e só então
  consente. O texto do consentimento diz o que a instituição passa a ver e o que
  não vê.
- **Painel da instituição** (`(instituicao)/instituicao/`), com cinco abas: visão
  geral, turmas, alunos, professores e ano letivo. Criação de turma, geração de
  código, vínculo de professor e aprovação de entradas em lote estão dentro da
  aba Turmas.
- **Painel do professor** (`(professor)/professor/page.tsx`), em dois níveis:
  visão geral das turmas com alertas acionáveis, e visão da turma com
  indicadores, fila de aprovação e lista de alunos.
- **Página pública do convite de professor**
  (`(public)/convite-professor/[token]`). Não tem seletor de perfil de propósito:
  papel e instituição vêm do token, no servidor.

Correções de defeito feitas junto:
- O painel da instituição saiu do grupo de rotas do aluno. Antes herdava a
  moldura do estudante, e um diretor via a própria barra de nível e ofensiva.
  Agora os dois painéis usam `PainelShell`, com guarda de sessão e de papel.
- O grupo `(professor)` não tinha layout nenhum: a tela renderizava sem guarda de
  sessão para qualquer visitante. Agora tem.
- **Todo login ia para `/dashboard`**, o hub do aluno. O admin de instituição
  caía numa tela que não é dele e o professor não tinha caminho nenhum até o
  próprio painel — a rota existia e nenhum link levava a ela. `lib/rota-inicial.ts`
  passa a decidir o destino pelo papel, usado no contexto de autenticação, no
  login e no cadastro.

**Passo 8 — nível 3 do painel do professor: CONCLUÍDO.** Sem migração.
perfis.md está entregue.

- `GET /turma/:id/alunos`: alunos DESTA turma, com a janela de cada matrícula.
  Resolve a limitação anterior — a visão da turma mostrava a lista agregada de
  todas as turmas do professor como se fosse daquela turma.
- `GET /turma/:id/alunos/:estudanteId`: o aluno por dentro. Desempenho por área,
  temas em que mais erra, uso semana a semana e redações com nota geral, nota por
  competência e o texto.
- `desempenho/detalhe-aluno.repository.ts`: todas as consultas recebem
  `visivelDesde` e filtram por ele. Aqui o filtro é um `gte` simples, porque é um
  aluno com uma janela só, diferente das agregações de turma.
- `(professor)/professor/components/VisaoDoAluno.tsx`: a tela. O texto da redação
  fica FECHADO por padrão, atrás de um botão — é produção pessoal do aluno, não
  métrica, e não deve aparecer por acidente ao abrir a tela.
- A autorização usa `janelaDoAluno`, que faz as duas coisas numa chamada:
  confirma que o aluno está no escopo do observador e devolve desde quando. Se
  não estiver, recusa antes de qualquer consulta de dado pessoal.

Os temas de erro vêm de `tentativa_resposta.temas_erro`, um array JSON gravado
pelo detector de padrão de erro, aberto em linhas com `jsonb_array_elements_text`.
Só tentativas ERRADAS entram: o objetivo é mostrar onde intervir.

**Defeito corrigido no caminho.** `GET /class/analytics`, a rota do painel do
professor, lia o papel de `req.user.tipoPerfil` — campo que não existe em
`AuthenticatedRequest`, onde o papel vem do JWT em `app_metadata.papel`. O valor
era sempre undefined, então a rota respondia 401 para todo mundo, professor
incluído: o painel do professor nunca funcionou. A permissão passou para
`@Roles()`, que entra na tabela ROUTE_ROLES e é conferida em CI.

Exceções deliberadas, ainda com o termo antigo:
- `ranking_escopo` com valor `'escola'` — pertence à Arena, que está oculta.
  Renomear custaria migração para recurso fora do ar.
- `responsavel_escola`, o valor de escalonamento do protocolo de cuidado — é
  emitido pelo modelo de IA (está no prompt versionado da socrática) e fica
  gravado em `ocorrencia_risco.acao_tomada`. Renomear exige bumpar o prompt e
  migrar dado, e o destino institucional do protocolo é a decisão que ficou
  pendente. Renomear junto com ela.

Próximos passos, na ordem: modelo de dados novo (instituição, ano letivo, turma
com dois donos, vínculo professor–turma, solicitação de entrada), depois regras
de autorização no servidor, depois turma e código de convite, depois painel do
professor, por último painel da instituição.
