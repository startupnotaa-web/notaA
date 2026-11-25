-- Marca as questões que não podem ser servidas e o idioma dos itens de língua estrangeira.
-- Auditoria somente leitura de 2026-10-22 sobre as 278 linhas de questoes_enem em produção.
--
-- PRÉ-REQUISITO: migração 0019_questao_suspensa_e_idioma.sql aplicada.
-- EFEITO: grava 82 linhas em questao_suspensa (81 'suspensa', 1 'anulada') e define `idioma`
--   nos 20 itens de língua estrangeira (10 inglês, 10 espanhol). Não altera nenhuma outra coluna.
-- CHAVE: 8 primeiros caracteres do md5(enunciado). São únicos nas 278 linhas (verificado em 2026-10-22).
-- SEGURANÇA: transação única. Qualquer conferência que falhe aborta tudo. Pode rodar de novo (idempotente).
--
-- Motivos: alternativa_e_truncada_provavel (heurística, 86% de precisão medida), gabarito_diverge_do_inep
-- (8 itens de espanhol; o 02_corrigir-gabarito corrige a letra, mas eles ficam suspensos até um curador
-- conferir), alternativa_vazia, enunciado_vazio, anulada_no_inep.
begin;

do $$
begin
  if to_regclass('public.questao_suspensa') is null or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'questoes_enem' and column_name = 'idioma'
  ) then
    raise exception 'aplique antes a migração 0019_questao_suspensa_e_idioma.sql';
  end if;
end $$;

insert into public.questao_suspensa (questao_id, situacao, motivos, origem)
select q.id, v.situacao, v.motivos, 'auditoria-2026-10-22'
from (values
    ('8c30bb51', 'suspensa', array['gabarito_diverge_do_inep','alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q1
    ('803fc6b4', 'suspensa', array['gabarito_diverge_do_inep','alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q3
    ('33eda5d3', 'suspensa', array['gabarito_diverge_do_inep','alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q4
    ('25c4ade3', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q5
    ('3d9c4df7', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q6
    ('fe991c17', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q7
    ('eaa1314a', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q8
    ('4a4249c3', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q9
    ('758adc28', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q10
    ('26615db6', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q11
    ('9acbf0f8', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q12
    ('f6636f59', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q13
    ('2b78b3da', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q15
    ('2b8e4c27', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q16
    ('4f1446b2', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q17
    ('40c2fada', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q20
    ('eec227cc', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q21
    ('817a618a', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q23
    ('b4bda561', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q24
    ('0682f735', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q26
    ('0ada5835', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q28
    ('4e9857f8', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q30
    ('47759aff', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q37
    ('c418941e', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q38
    ('cb67469d', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q40
    ('1c1f7d6f', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q41
    ('76fb70d5', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q42
    ('de11f5eb', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q44
    ('4101dd0c', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 linguagens q45
    ('5aea5a26', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 humanas q48
    ('d3181740', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 humanas q56
    ('faa5661f', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 humanas q60
    ('b5a2f960', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 humanas q63
    ('1ac9a23a', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 humanas q67
    ('e185160a', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 humanas q81
    ('b62a20b0', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 1 humanas q83
    ('050fc6ed', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q93
    ('daa2b3db', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q98
    ('7b23605b', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q99
    ('82db42a8', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q100
    ('5bc8d6c9', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q103
    ('1fea4ac7', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q106
    ('94bf3b54', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q110
    ('0d098452', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q117
    ('3d535a02', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q122
    ('5a968e3c', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 natureza q130
    ('d778299b', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 matematica q145
    ('734a3bf0', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2023 dia 2 matematica q148
    ('7fc56270', 'suspensa', array['alternativa_vazia','enunciado_vazio']),  -- 2023 dia 2 matematica q149
    ('64d225b7', 'suspensa', array['alternativa_vazia']),  -- 2023 dia 2 matematica q161
    ('acef0c49', 'suspensa', array['alternativa_vazia']),  -- 2023 dia 2 matematica q172
    ('deffc1f8', 'anulada', array['anulada_no_inep']),  -- 2023 dia 2 matematica q177
    ('bea309ea', 'suspensa', array['alternativa_vazia']),  -- 2023 dia 2 matematica q179
    ('80e1d44c', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q1
    ('6fab72c5', 'suspensa', array['gabarito_diverge_do_inep']),  -- 2024 dia 1 linguagens q1
    ('64d301ab', 'suspensa', array['gabarito_diverge_do_inep']),  -- 2024 dia 1 linguagens q2
    ('abc9e170', 'suspensa', array['gabarito_diverge_do_inep']),  -- 2024 dia 1 linguagens q3
    ('43184058', 'suspensa', array['gabarito_diverge_do_inep','alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q4
    ('3f55f72f', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q5
    ('377018bf', 'suspensa', array['gabarito_diverge_do_inep','alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q5
    ('4d44470f', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q10
    ('894c4d78', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q11
    ('b2d1ebdb', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q20
    ('621e154e', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q21
    ('3e90b996', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q26
    ('9539109d', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q29
    ('8e151287', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q31
    ('e583a74b', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q32
    ('1a0bdce1', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q33
    ('5787de7d', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q35
    ('fbdccbd9', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q36
    ('595f3f68', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q37
    ('79bb350a', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q38
    ('c0098543', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q39
    ('693e9913', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q41
    ('9cd16424', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q42
    ('42b73787', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q43
    ('887406d8', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 linguagens q45
    ('51397669', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 humanas q59
    ('f360fab7', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 humanas q61
    ('af30db08', 'suspensa', array['alternativa_e_truncada_provavel']),  -- 2024 dia 1 humanas q75
    ('10274e5f', 'suspensa', array['alternativa_e_truncada_provavel'])  -- 2024 dia 1 humanas q84
) as v(h8, situacao, motivos)
join public.questoes_enem q on left(md5(q.enunciado), 8) = v.h8
on conflict (questao_id) do nothing;

update public.questoes_enem q
   set idioma = v.idioma::idioma_estrangeiro
  from (values
    ('e0acfc8e', 'ingles'),  -- 2023 q1 inglês
    ('8c30bb51', 'espanhol'),  -- 2023 q1 espanhol
    ('c25d5b4c', 'ingles'),  -- 2023 q2 inglês
    ('67c2d1a6', 'espanhol'),  -- 2023 q2 espanhol
    ('46136aa7', 'ingles'),  -- 2023 q3 inglês
    ('803fc6b4', 'espanhol'),  -- 2023 q3 espanhol
    ('200d894f', 'ingles'),  -- 2023 q4 inglês
    ('33eda5d3', 'espanhol'),  -- 2023 q4 espanhol
    ('b9819fbd', 'ingles'),  -- 2023 q5 inglês
    ('25c4ade3', 'espanhol'),  -- 2023 q5 espanhol
    ('80e1d44c', 'ingles'),  -- 2024 q1 inglês
    ('6fab72c5', 'espanhol'),  -- 2024 q1 espanhol
    ('e38ac8cc', 'ingles'),  -- 2024 q2 inglês
    ('64d301ab', 'espanhol'),  -- 2024 q2 espanhol
    ('c60bdeca', 'ingles'),  -- 2024 q3 inglês
    ('abc9e170', 'espanhol'),  -- 2024 q3 espanhol
    ('de0dc2ff', 'ingles'),  -- 2024 q4 inglês
    ('43184058', 'espanhol'),  -- 2024 q4 espanhol
    ('3f55f72f', 'ingles'),  -- 2024 q5 inglês
    ('377018bf', 'espanhol')  -- 2024 q5 espanhol
  ) as v(h8, idioma)
 where left(md5(q.enunciado), 8) = v.h8
   and q.idioma is distinct from v.idioma::idioma_estrangeiro;

do $$
declare n_susp int; n_anul int; n_ing int; n_esp int;
begin
  select count(*) into n_susp from public.questao_suspensa where origem = 'auditoria-2026-10-22';
  select count(*) into n_anul from public.questao_suspensa where origem = 'auditoria-2026-10-22' and situacao = 'anulada';
  select count(*) filter (where idioma = 'ingles'), count(*) filter (where idioma = 'espanhol')
    into n_ing, n_esp from public.questoes_enem;
  if n_susp <> 82 or n_anul <> 1 then
    raise exception 'esperado 82 suspensas (1 anulada), obtido % (% anulada)', n_susp, n_anul;
  end if;
  if n_ing <> 10 or n_esp <> 10 then
    raise exception 'esperado 10 inglês e 10 espanhol, obtido % e %', n_ing, n_esp;
  end if;
end $$;

rollback;  -- trocar pelo COMMIT abaixo só depois de conferir os números acima
-- commit;  -- descomentar e remover o rollback somente depois de conferir os números
