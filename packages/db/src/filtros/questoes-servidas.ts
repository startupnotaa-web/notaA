import { sql, type SQL } from 'drizzle-orm';
import { questaoSuspensa, questoesEnem } from '../schema';

export type IdiomaDaQuestao = NonNullable<(typeof questoesEnem.$inferSelect)['idioma']>;

/**
 * Regra ÚNICA do que o aluno pode receber de `questoes_enem`. Todo consumidor
 * que sorteia questão para aluno usa isto, para a regra não divergir.
 *
 * 1. Legibilidade: a extração do PDF quebrou frações em várias linhas e deixou
 *    questões citando figura sem `imagem_url`. Servir essas seria entregar
 *    questão impossível.
 * 2. Exceções: questão suspensa, anulada ou arquivada (`questao_suspensa`) nunca
 *    é servida, seja qual for o motivo.
 * 3. Idioma: item de língua estrangeira só vai a quem escolheu aquele idioma.
 *    Sem idioma informado, itens de língua estrangeira NÃO são servidos — nunca
 *    se escolhe um idioma pelo aluno.
 *
 * Use em consultas que partem de `questoes_enem` sem apelido (a subconsulta
 * correlaciona por `questoes_enem.id`).
 */
export function questaoServivel(idioma?: IdiomaDaQuestao | null): SQL {
  const doIdioma = idioma
    ? sql`${questoesEnem.idioma} is null or ${questoesEnem.idioma} = ${idioma}`
    : sql`${questoesEnem.idioma} is null`;
  return sql`
    not exists (
      select 1 from jsonb_array_elements_text(${questoesEnem.alternativas}) alt
      where alt like '%' || chr(10) || '%' or length(trim(alt)) <= 3
    )
    and (
      ${questoesEnem.imagemUrl} is not null
      or ${questoesEnem.enunciado} !~* '(esquema|figura|gr[áa]fico|imagem|tabela|mapa|charge|tirinha)'
    )
    and not exists (
      select 1 from ${questaoSuspensa} where ${questaoSuspensa.questaoId} = ${questoesEnem.id}
    )
    and (${doIdioma})
  `;
}
