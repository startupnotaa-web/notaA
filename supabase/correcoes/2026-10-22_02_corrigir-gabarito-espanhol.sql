-- Corrige o gabarito das 8 questões de ESPANHOL (itens 1–5, 2ª ocorrência) que o
-- enem-extractor gravou com a letra do inglês.
--
-- FONTE DE VERDADE: ITENS_PROVA_2023.csv e ITENS_PROVA_2024.csv do INEP, caderno
-- amarelo, TP_LINGUA = 1 (espanhol). Auditoria de 2026-10-22.
-- GUARDA: cada UPDATE só roda se o valor atual for o esperado e precisa afetar
--   exatamente 1 linha; senão a transação inteira aborta. Rodar duas vezes falha
--   de propósito na segunda (o valor atual já não é o esperado).
-- NÃO FAZ: a anulada de 2023 (q177, gabarito 'X' no INEP) — o esquema não
--   representa anulada; ela entra como situacao='anulada' no script 01.
-- NÃO FAZ: não toca tentativa_resposta (é só de inserção). Há 6 tentativas em 4 dessas
--   questões, 1 marcada como acerto; reavaliar é decisão separada.
begin;

do $$
declare r record; n int;
begin
  for r in select * from (values
    ('8c30bb51', 0, 1),  -- 2023 q1 espanhol: gravado B → INEP A
    ('803fc6b4', 0, 1),  -- 2023 q3 espanhol: gravado B → INEP A
    ('33eda5d3', 4, 3),  -- 2023 q4 espanhol: gravado D → INEP E
    ('6fab72c5', 3, 0),  -- 2024 q1 espanhol: gravado A → INEP D
    ('64d301ab', 3, 0),  -- 2024 q2 espanhol: gravado A → INEP D
    ('abc9e170', 3, 2),  -- 2024 q3 espanhol: gravado C → INEP D
    ('43184058', 0, 4),  -- 2024 q4 espanhol: gravado E → INEP A
    ('377018bf', 2, 0)  -- 2024 q5 espanhol: gravado A → INEP C
  ) as t(h8, nova, atual)
  loop
    update public.questoes_enem
       set correta = r.nova
     where left(md5(enunciado), 8) = r.h8 and correta = r.atual;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'item % afetou % linhas (esperado 1)', r.h8, n; end if;
  end loop;
end $$;

-- Cópias já gravadas em banco_de_itens (mesmo id) herdam a letra corrigida.
update public.banco_de_itens b
   set gabarito = chr(65 + q.correta)
  from public.questoes_enem q
 where b.id = q.id
   and b.gabarito <> chr(65 + q.correta)
   and left(md5(q.enunciado), 8) in (select h8 from (values ('8c30bb51'), ('803fc6b4'), ('33eda5d3'), ('6fab72c5'), ('64d301ab'), ('abc9e170'), ('43184058'), ('377018bf')) as v(h8));

rollback;  -- trocar pelo COMMIT abaixo só depois de conferir os números acima
-- commit;  -- descomentar e remover o rollback somente depois de conferir os números
