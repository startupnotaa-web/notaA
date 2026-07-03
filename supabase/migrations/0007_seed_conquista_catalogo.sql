-- Custom SQL migration file, put your code below! --

-- Missão 3 — catálogo de conquistas (doc 04 §7). `GamificacaoService.grantXp` /
-- `registrarAtividadeValida` já checam estes códigos e chamam grantAchievement,
-- mas grantAchievement ignora silenciosamente código inexistente no catálogo —
-- sem estas linhas, NENHUM marco de XP ou de ofensiva era concedido de fato.
INSERT INTO "conquista" ("codigo", "criterio", "xp_associado", "ativo") VALUES
  ('primeiro_xp',     '{"tipo": "xp_total", "limiar": 1}',        5,  true),
  ('xp_100',          '{"tipo": "xp_total", "limiar": 100}',      10, true),
  ('xp_500',          '{"tipo": "xp_total", "limiar": 500}',      25, true),
  ('streak_3_dias',   '{"tipo": "streak_dias", "dias": 3}',       10, true),
  ('streak_7_dias',   '{"tipo": "streak_dias", "dias": 7}',       25, true),
  ('streak_15_dias',  '{"tipo": "streak_dias", "dias": 15}',      50, true),
  ('streak_30_dias',  '{"tipo": "streak_dias", "dias": 30}',      100, true),
  ('streak_60_dias',  '{"tipo": "streak_dias", "dias": 60}',      150, true),
  ('streak_120_dias', '{"tipo": "streak_dias", "dias": 120}',     250, true),
  ('streak_240_dias', '{"tipo": "streak_dias", "dias": 240}',     400, true)
ON CONFLICT ("codigo") DO NOTHING;
