-- Renomeia "escola" para "instituição" em todo o schema.
-- Decisão de 2026-10-01, registrada em perfis-decisoes.md: o termo na plataforma
-- é "instituição", nunca "escola", inclusive no banco.
--
-- Renomeação PURA: nenhuma linha é criada, movida ou apagada. Verificado contra
-- produção antes de rodar: 0 linhas em escola, 0 usuários com escola_id, 0 turmas,
-- 0 matrículas, 0 assinaturas, 11 usuários (todos 'estudante').
--
-- Escrita à mão de propósito. `drizzle-kit generate` resolveria a renomeação de
-- tabela/coluna como drop e create, o que descartaria dados.

-- 1. A tabela e sua chave primária
ALTER TABLE "escola" RENAME TO "instituicao";
ALTER TABLE "instituicao" RENAME CONSTRAINT "escola_pkey" TO "instituicao_pkey";

-- 2. Colunas que apontam para ela
ALTER TABLE "usuario" RENAME COLUMN "escola_id" TO "instituicao_id";
ALTER TABLE "turma" RENAME COLUMN "escola_id" TO "instituicao_id";
ALTER TABLE "assinatura" RENAME COLUMN "escola_id" TO "instituicao_id";

-- 3. Chaves estrangeiras (o nome carrega tabela e coluna, então todas mudam)
ALTER TABLE "usuario" RENAME CONSTRAINT "usuario_escola_id_escola_id_fk" TO "usuario_instituicao_id_instituicao_id_fk";
ALTER TABLE "turma" RENAME CONSTRAINT "turma_escola_id_escola_id_fk" TO "turma_instituicao_id_instituicao_id_fk";
ALTER TABLE "assinatura" RENAME CONSTRAINT "assinatura_escola_id_escola_id_fk" TO "assinatura_instituicao_id_instituicao_id_fk";

-- 4. Índices e unicidade
ALTER INDEX "idx_usuario_escola" RENAME TO "idx_usuario_instituicao";
ALTER INDEX "idx_assinatura_escola" RENAME TO "idx_assinatura_instituicao";
ALTER TABLE "turma" RENAME CONSTRAINT "uq_turma_escola_nome_periodo" TO "uq_turma_instituicao_nome_periodo";

-- 5. Valores de enumeração
--    'plano_tipo': o plano institucional.
--    'tipo_perfil': 'gestor' passa a ser 'admin_instituicao' (mesma decisão).
--    NÃO se mexe em 'ranking_escopo', cujo valor 'escola' pertence à Arena, que
--    está oculta — renomear código fora do ar não traz benefício.
ALTER TYPE "plano_tipo" RENAME VALUE 'escola' TO 'instituicao';
ALTER TYPE "tipo_perfil" RENAME VALUE 'gestor' TO 'admin_instituicao';

-- A CHECK "ck_assinatura_titular_unico" referencia a coluna renomeada, mas o
-- Postgres atualiza a expressão sozinho e o nome dela não cita "escola".
