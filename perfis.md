# Contexto
Vamos adicionar à plataforma uma estrutura com turmas, professores e instituições.
Na plataforma, use sempre o termo **"instituição"** (nunca "escola") em textos,
telas, código e banco de dados.

O aluno continua podendo usar a plataforma de forma independente; entrar em uma
turma é opcional.

# Tipos de conta
Cada conta tem um único papel. Uma mesma pessoa que exerce dois papéis precisa de
duas contas separadas (ex.: um coordenador que também dá aula usa uma conta de
admin da instituição e outra de professor).

1. **Admin da instituição**: gerencia a instituição. Não é professor e não dá aula
   pela plataforma com essa conta.
2. **Professor institucional**: vinculado a uma instituição. É adicionado pela
   instituição. **Não cria turmas** — apenas leciona nas turmas às quais a
   instituição o vincular.
3. **Professor independente**: cadastra-se sozinho na plataforma, assina um plano
   e cria e gerencia suas próprias turmas. Não é vinculado a nenhuma instituição.
   Se um professor institucional quiser ter turmas independentes, ele precisa de
   outra conta, do tipo professor independente.
4. **Aluno**: cadastra-se normalmente e pode usar a plataforma sozinho.


# Ano letivo
- Toda turma pertence a um **ano letivo**.
- A instituição e o professor independente podem criar um novo ano letivo e
  arquivar o anterior.
- Turmas de anos anteriores ficam arquivadas: somente leitura, com histórico
  preservado.
- Os painéis mostram por padrão o ano letivo atual, com filtro para anos anteriores.

# Turmas
Regras:
- **Não existe turma sem professor.** Toda turma ativa tem pelo menos um professor.
- Um professor pode ter várias turmas, e uma turma pode ter vários professores.
- Só criam turmas: a **instituição** (para seus professores) e o **professor
  independente** (para si mesmo). Ou seja, um professor só pode criar turmas se não estiver vinculado a alguma instituição, se for um independente.

Fluxo de criação (igual para instituição e professor independente):
1. Botão **"Criar turma"**.
2. Tela com um único campo: **nome da turma**.
3. Ao salvar, a turma é criada no ano letivo atual e recebe um **código de convite**.
   - Professor independente: ele já é o professor da turma.
   - Instituição: vincula um ou mais professores à turma. O código só pode ser
     usado depois que a turma tiver pelo menos um professor.
4. Quem criou a turma distribui o código aos alunos.

# Código de convite e aprovação
- O código é por turma, compartilhado com todos os alunos dela.
- O aluno insere o código na seção "Entrar em uma turma" da tela de **Perfil**.
- Antes de enviar, o aluno vê a confirmação com nome da turma e da instituição
  (ou do professor independente).
- **Toda solicitação precisa ser aprovada por um professor da turma.** Até lá,
  o aluno fica como "pendente" e não aparece nos dados da turma.
- O professor vê as solicitações pendentes e pode aprovar ou recusar
  (individualmente ou em lote).
- O código pode ser regenerado (invalidando o anterior) por quem criou a turma.
- Código inválido ou regenerado: mensagem de erro clara.

# Painel da instituição (admin)
**Gestão de professores**
- Adicionar professor: a instituição envia um convite (por e-mail ou link, essa parte ainda será configurada) e o
  professor cria sua conta de professor institucional a partir dele.
- Listar, editar e remover professores.
- Vincular e desvincular professores das turmas.
- Ao remover um professor, avisar se alguma turma ficaria sem professor e
  exigir outro professor antes de concluir.

**Gestão de alunos**
- Listar alunos de todas as turmas, com busca e filtro por turma.
- Mover aluno de turma e remover aluno da instituição.
- Remover um aluno tira o vínculo com a instituição; **não apaga a conta do aluno**,
  que continua sendo dele.

**Gestão de turmas**
- Criar, renomear e arquivar turmas.
- Ver e regenerar o código de convite de cada turma.
- Gerenciar anos letivos.

**Visão geral**
- Indicadores agregados da instituição como um todo.
- Indicadores **por turma** (desempenho, engajamento, alunos ativos).
- **Não** exibir comparativos ou rankings entre professores.

# Painel do professor
Serve para professor institucional e independente. O professor só acessa as turmas
às quais está vinculado.

Três níveis:
1. **Visão geral**: resumo de todas as suas turmas e alertas acionáveis
   (ex.: "5 alunos sem acesso há 7 dias", "turma com baixo acerto em frações").
2. **Visão da turma**: métricas gerais, distribuição de desempenho, lista de alunos
   com indicadores principais, solicitações de entrada pendentes.
3. **Visão do aluno**: progresso detalhado, atividades, acertos e erros por tema,
   frequência de uso e evolução no tempo.

O professor independente também tem no painel: criar turmas, gerenciar códigos de
convite, remover alunos e gerenciar anos letivos das suas turmas.

# Aluno
- Cadastro aberto, sem necessidade de turma.
- Na tela de Perfil, seção para inserir código de convite e ver suas turmas
  (ativas e pendentes).
- A experiência de uso é a mesma com ou sem turma.

# Permissões (aplicar no backend, não só esconder no front)
- Admin da instituição: acesso a tudo da própria instituição; nada de outras.
- Professor: apenas suas turmas e os alunos aprovados nelas.
- Aluno: apenas os próprios dados.
- Professor e instituição veem apenas os dados do aluno gerados **após a aprovação**
  na turma.

# Entregáveis
1. Modelo de dados com: instituição, admin, professor (institucional e
   independente), aluno, ano letivo, turma, vínculo professor–turma,
   solicitação de entrada, plano.
2. Fluxos de tela para cada tipo de conta.
3. Regras de autorização no backend.
4. Telas: painel da instituição, painel do professor (3 níveis), criação de turma,
   aprovação de solicitações, seção de convite no perfil do aluno.