# Correções de dado

Scripts de **dado** que se aplicam à mão, uma vez, depois de revisados. Ficam fora
de `supabase/migrations/` de propósito: nenhuma ferramenta os aplica sozinha, e
eles dependem do estado real de produção (chaves por hash do enunciado), então
rodam em branco, sem efeito, em bancos de desenvolvimento.

Cada script é uma transação única, com conferências que abortam tudo se algo não
bater. Os arquivos não têm texto de prova: só chaves (8 primeiros caracteres do
`md5` do enunciado), ano, dia, área e número da questão.

| Ordem | Arquivo | O que faz |
|---|---|---|
| 0 | `supabase/migrations/0019_questao_suspensa_e_idioma.sql` | cria `questao_suspensa` e `questoes_enem.idioma` (estrutura, com RLS) |
| 1 | `2026-10-22_01_marcar-suspensas-e-idioma.sql` | marca as 82 questões fora do ar e o idioma dos 20 itens de língua estrangeira |
| 2 | `2026-10-22_02_corrigir-gabarito-espanhol.sql` | corrige a letra de 8 itens de espanhol e as 4 cópias em `banco_de_itens` |

Antes de aplicar qualquer um: a migração 0019 primeiro, e só então a API que a usa.
