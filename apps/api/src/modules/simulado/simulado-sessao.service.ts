import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  and,
  bancoDeItens,
  eq,
  notInArray,
  questoesEnem,
  sessaoAvaliativa,
  simuladoQuestao,
  simuladoSessao,
  sql,
  tentativaResposta,
  type Database,
} from '@notaa/db';
import {
  GenerateQuizResponseSchema,
  SIMULADO_AREAS,
  type AreaConhecimento,
  type DificuldadeTri,
  type LLMProviderPort,
  type ResumeSimuladoResponse,
  type SaveSimuladoAnswerRequest,
  type SaveSimuladoAnswerResponse,
  type SimuladoModo,
  type SimuladoRecorte,
  type SimuladoRelatorio,
  type StartSimuladoResponse,
} from '@notaa/contracts';
import { PROMPT_QUIZ_TEMPLATE, montarPromptQuiz } from '@notaa/prompts';
import { DB_CLIENT } from '../../db/db.tokens';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import { LETRAS, calcularXp, intercalarPorArea, montarPlano } from './simulado.montador';

/**
 * Questão do banco público só entra na prova se estiver legível: a extração do
 * PDF quebrou frações em várias linhas (91 de 278) e deixou questões citando
 * figura sem `imagem_url` (38). Servir essas seria entregar questão impossível.
 */
const FILTRO_QUALIDADE = sql`
  not exists (
    select 1 from jsonb_array_elements_text(${questoesEnem.alternativas}) alt
    where alt like '%' || chr(10) || '%' or length(trim(alt)) <= 3
  )
  and (
    ${questoesEnem.imagemUrl} is not null
    or ${questoesEnem.enunciado} !~* '(esquema|figura|gr[áa]fico|imagem|tabela|mapa|charge|tirinha)'
  )
`;

interface QuestaoMontada {
  itemId: string;
  area: AreaConhecimento;
  dificuldade: DificuldadeTri;
  origem: 'enem' | 'ia';
  enunciado: string;
  alternativas: { id: string; texto: string }[];
  gabarito: string;
  imagemUrl: string | null;
}

@Injectable()
export class SimuladoSessaoService {
  private readonly logger = new Logger('SimuladoSessao');

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
    private readonly gamificacao: GamificacaoService,
  ) {}

  async start(
    estudanteId: string,
    modo: SimuladoModo,
    limiteMinutos?: number,
  ): Promise<StartSimuladoResponse> {
    const plano = montarPlano(SIMULADO_AREAS);
    const usados: string[] = [];
    const montadas: QuestaoMontada[] = [];
    const faltantes: typeof plano = [];

    // 1ª passada: consome o banco real, respeitando área + dificuldade.
    for (const slot of plano) {
      const questao = await this.sortearDoEnem(slot.area, slot.dificuldade, usados);
      if (questao) {
        usados.push(questao.itemId);
        montadas.push(questao);
      } else {
        faltantes.push(slot);
      }
    }

    // 2ª passada: a IA cobre o que o banco público não tem (hoje, matemática).
    // Em paralelo — sequencial deixaria a criação da prova lenta demais.
    if (faltantes.length > 0) {
      this.logger.log(
        `[SIMULADO_DIAGNOSTICO] completando ${faltantes.length}/${plano.length} questões via IA: ` +
          faltantes.map((f) => `${f.area}/${f.dificuldade}`).join(', '),
      );
      const geradas = await Promise.all(
        faltantes.map((slot) => this.gerarComIa(estudanteId, slot.area, slot.dificuldade)),
      );
      montadas.push(...geradas);
    }

    const ordenadas = intercalarPorArea(montadas);

    await this.db.insert(bancoDeItens).values(
      ordenadas.map((q) => ({
        id: q.itemId,
        areaConhecimento: q.area,
        competencia: `SIMULADO_${q.dificuldade.toUpperCase()}`,
        paramA: '1',
        paramB: '0',
        paramC: '0.2',
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        // Nenhuma questão daqui é calibrada — θ não pode ser movido por elas.
        naoCalibrado: true,
        ativo: true,
        metadadosUso: { origem: q.origem, contexto: 'simulado' },
      })),
    ).onConflictDoNothing({ target: bancoDeItens.id });

    const [sessao] = await this.db
      .insert(sessaoAvaliativa)
      // area_conhecimento fica NULL: simulado é multi-área por definição.
      .values({ estudanteId, tipo: 'simulado' })
      .returning({ id: sessaoAvaliativa.id });
    const sessaoId = sessao!.id;

    const expiraEm =
      modo === 'cronometrado' && limiteMinutos
        ? new Date(Date.now() + limiteMinutos * 60_000)
        : null;

    await this.db.insert(simuladoSessao).values({
      sessaoId,
      modo,
      limiteMinutos: limiteMinutos ?? null,
      expiraEm,
      totalQuestoes: ordenadas.length,
    });

    await this.db.insert(simuladoQuestao).values(
      ordenadas.map((q, i) => ({
        sessaoId,
        itemId: q.itemId,
        ordem: i + 1,
        area: q.area,
        dificuldade: q.dificuldade,
        origem: q.origem,
      })),
    );

    return {
      sessaoId,
      modo,
      limiteMinutos: limiteMinutos ?? null,
      expiraEm: expiraEm?.toISOString() ?? null,
      // Sem gabarito: o aluno não pode ver a resposta pelo DevTools (H2.1).
      questoes: ordenadas.map((q, i) => ({
        itemId: q.itemId,
        ordem: i + 1,
        area: q.area,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        imagemUrl: q.imagemUrl,
      })),
    };
  }

  private async sortearDoEnem(
    area: AreaConhecimento,
    dificuldade: DificuldadeTri,
    excluir: string[],
  ): Promise<QuestaoMontada | null> {
    const condicoes = [
      eq(questoesEnem.area, area),
      eq(questoesEnem.dificuldadeTri, dificuldade),
      FILTRO_QUALIDADE,
    ];
    if (excluir.length > 0) condicoes.push(notInArray(questoesEnem.id, excluir));

    const [row] = await this.db
      .select()
      .from(questoesEnem)
      .where(and(...condicoes))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!row) return null;

    const alternativas = (row.alternativas as string[]).map((texto, i) => ({
      id: LETRAS[i] ?? 'A',
      texto,
    }));
    return {
      itemId: row.id,
      area: row.area,
      dificuldade,
      origem: 'enem',
      enunciado: row.textoBase ? `${row.textoBase}\n\n${row.enunciado}` : row.enunciado,
      alternativas,
      gabarito: LETRAS[row.correta] ?? 'A',
      imagemUrl: row.imagemUrl,
    };
  }

  private async gerarComIa(
    estudanteId: string,
    area: AreaConhecimento,
    dificuldade: DificuldadeTri,
  ): Promise<QuestaoMontada> {
    const rotulo = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' }[dificuldade];
    const sistema = montarPromptQuiz({
      instrucoes: 'objetiva e contextualizada',
      objetivo: 'ir bem no ENEM',
      nivel: dificuldade === 'facil' ? 1 : dificuldade === 'media' ? 2 : 3,
      area,
      tema: `questão de ${area} no padrão ENEM`,
      instrucaoDificuldade: `A dificuldade deve ser ${rotulo}.`,
      instrucaoAntiRepeticao: '',
    });

    const { data } = await this.llm.complete({
      sistema,
      contexto: { area, dificuldade: rotulo, formato: 'simulado ENEM' },
      schema: GenerateQuizResponseSchema,
      temperature: 1.1,
      origem: 'quiz',
      usuarioId: estudanteId,
      promptVersao: PROMPT_QUIZ_TEMPLATE.versao,
    });

    return {
      itemId: randomUUID(),
      area,
      dificuldade,
      origem: 'ia',
      enunciado: data.enunciado,
      alternativas: data.alternativas.map((texto, i) => ({ id: LETRAS[i] ?? 'A', texto })),
      gabarito: LETRAS[data.correta] ?? 'A',
      imagemUrl: null,
    };
  }

  /**
   * Devolve a prova em andamento para o aluno continuar de onde parou. Não
   * remonta nada: as questões foram congeladas em `simulado_questao` no start,
   * então a ordem e o sorteio são exatamente os mesmos.
   */
  async retomar(sessaoId: string, estudanteId: string): Promise<ResumeSimuladoResponse> {
    const { cabecalho } = await this.carregarSessao(sessaoId, estudanteId);

    const rows = await this.db
      .select({
        itemId: simuladoQuestao.itemId,
        ordem: simuladoQuestao.ordem,
        area: simuladoQuestao.area,
        enunciado: bancoDeItens.enunciado,
        alternativas: bancoDeItens.alternativas,
        // `banco_de_itens` não guarda imagem; as questões do ENEM reusam o id
        // da questão original, então a imagem vem de lá. Item de IA não tem.
        imagemUrl: questoesEnem.imagemUrl,
        respostaDada: tentativaResposta.resposta,
      })
      .from(simuladoQuestao)
      .innerJoin(bancoDeItens, eq(bancoDeItens.id, simuladoQuestao.itemId))
      .leftJoin(questoesEnem, eq(questoesEnem.id, simuladoQuestao.itemId))
      .leftJoin(
        tentativaResposta,
        and(
          eq(tentativaResposta.sessaoId, simuladoQuestao.sessaoId),
          eq(tentativaResposta.itemId, simuladoQuestao.itemId),
        ),
      )
      .where(eq(simuladoQuestao.sessaoId, sessaoId))
      .orderBy(simuladoQuestao.ordem);

    const respostas: Record<string, string> = {};
    for (const r of rows) {
      if (r.respostaDada != null) respostas[r.itemId] = r.respostaDada;
    }

    return {
      sessaoId,
      modo: cabecalho.modo,
      limiteMinutos: cabecalho.limiteMinutos,
      expiraEm: cabecalho.expiraEm?.toISOString() ?? null,
      finalizado: cabecalho.finalizadoEm != null,
      expirado: this.expirou(cabecalho),
      respostas,
      // Continua sem gabarito — retomar não pode ser um atalho para a resposta.
      questoes: rows.map((r) => ({
        itemId: r.itemId,
        ordem: r.ordem,
        area: r.area,
        enunciado: r.enunciado,
        alternativas: r.alternativas as { id: string; texto: string }[],
        imagemUrl: r.imagemUrl ?? null,
      })),
    };
  }

  async saveAnswer(
    sessaoId: string,
    estudanteId: string,
    body: SaveSimuladoAnswerRequest,
  ): Promise<SaveSimuladoAnswerResponse> {
    const { cabecalho } = await this.carregarSessao(sessaoId, estudanteId);
    if (cabecalho.finalizadoEm) {
      throw new BadRequestException({
        error: { code: 'SIMULADO_FINALIZADO', message: 'Este simulado já foi finalizado.' },
      });
    }
    if (this.expirou(cabecalho)) {
      throw new BadRequestException({
        error: {
          code: 'SIMULADO_EXPIRADO',
          message: 'O tempo do simulado acabou. Finalize para ver seu relatório.',
        },
      });
    }

    const [questao] = await this.db
      .select()
      .from(simuladoQuestao)
      .where(and(eq(simuladoQuestao.sessaoId, sessaoId), eq(simuladoQuestao.itemId, body.itemId)))
      .limit(1);
    if (!questao) throw new NotFoundException();

    const [item] = await this.db
      .select({ gabarito: bancoDeItens.gabarito })
      .from(bancoDeItens)
      .where(eq(bancoDeItens.id, body.itemId))
      .limit(1);

    // Correção acontece AQUI, no servidor — mas o resultado não volta ao cliente.
    const acerto = item?.gabarito === body.respostaId;

    await this.db
      .insert(tentativaResposta)
      .values({
        estudanteId,
        itemId: body.itemId,
        sessaoId,
        resposta: body.respostaId,
        acerto,
        tempoRespostaMs: body.tempoRespostaMs,
        // Determinística por (sessão, item): trocar de resposta sobrescreve.
        idempotencyKey: `simulado:${sessaoId}:${body.itemId}`,
      })
      .onConflictDoUpdate({
        target: tentativaResposta.idempotencyKey,
        set: { resposta: body.respostaId, acerto, tempoRespostaMs: body.tempoRespostaMs },
      });

    const [contagem] = await this.db
      .select({ respondidas: sql<number>`count(*)::int` })
      .from(tentativaResposta)
      .where(eq(tentativaResposta.sessaoId, sessaoId));

    return {
      registrada: true,
      respondidas: contagem?.respondidas ?? 0,
      total: cabecalho.totalQuestoes,
    };
  }

  async finish(sessaoId: string, estudanteId: string): Promise<SimuladoRelatorio> {
    const { sessao, cabecalho } = await this.carregarSessao(sessaoId, estudanteId);
    if (cabecalho.finalizadoEm) return this.relatorio(sessaoId, estudanteId);

    const expirado = this.expirou(cabecalho);
    const questoes = await this.questoesComRespostas(sessaoId);
    // Em branco conta como erro — decisão de produto, igual a prova real.
    const acertos = questoes.filter((q) => q.acerto).length;

    const { xp, bloqueadoPorDesempenho } = calcularXp({
      acertos,
      total: questoes.length,
      modo: cabecalho.modo,
      limiteMinutos: cabecalho.limiteMinutos,
    });

    if (xp > 0) {
      await this.gamificacao.grantXp(estudanteId, 'simulado', xp);
      await this.gamificacao.registrarAtividadeValida(estudanteId);
    }

    await this.db
      .update(simuladoSessao)
      .set({ acertos, xpConcedido: xp, expirado, finalizadoEm: new Date() })
      .where(eq(simuladoSessao.sessaoId, sessaoId));
    await this.db
      .update(sessaoAvaliativa)
      .set({ status: 'concluida', finalizadoEm: new Date() })
      .where(eq(sessaoAvaliativa.id, sessaoId));

    this.logger.log(
      `[SIMULADO_DIAGNOSTICO] finish sessao=${sessaoId} acertos=${acertos}/${questoes.length} ` +
        `modo=${cabecalho.modo} limite=${cabecalho.limiteMinutos ?? '-'} expirado=${expirado} xp=${xp}`,
    );

    return this.montarRelatorio(sessaoId, sessao, { ...cabecalho, acertos, xpConcedido: xp, expirado }, questoes, bloqueadoPorDesempenho);
  }

  async relatorio(sessaoId: string, estudanteId: string): Promise<SimuladoRelatorio> {
    const { sessao, cabecalho } = await this.carregarSessao(sessaoId, estudanteId);
    if (!cabecalho.finalizadoEm) {
      throw new BadRequestException({
        error: {
          code: 'SIMULADO_EM_ANDAMENTO',
          message: 'O relatório só fica disponível depois de finalizar o simulado.',
        },
      });
    }
    const questoes = await this.questoesComRespostas(sessaoId);
    const { bloqueadoPorDesempenho } = calcularXp({
      acertos: cabecalho.acertos ?? 0,
      total: questoes.length,
      modo: cabecalho.modo,
      limiteMinutos: cabecalho.limiteMinutos,
    });
    return this.montarRelatorio(sessaoId, sessao, cabecalho, questoes, bloqueadoPorDesempenho);
  }

  // ── internos ───────────────────────────────────────────────────────────

  private expirou(cabecalho: { expiraEm: Date | null }): boolean {
    return cabecalho.expiraEm != null && Date.now() > cabecalho.expiraEm.getTime();
  }

  /** 404 (não 403) para não confirmar a existência de sessão alheia (doc 10). */
  private async carregarSessao(sessaoId: string, estudanteId: string) {
    const [row] = await this.db
      .select()
      .from(simuladoSessao)
      .innerJoin(sessaoAvaliativa, eq(sessaoAvaliativa.id, simuladoSessao.sessaoId))
      .where(eq(simuladoSessao.sessaoId, sessaoId))
      .limit(1);
    if (!row) throw new NotFoundException();
    if (row.sessao_avaliativa.estudanteId !== estudanteId) throw new NotFoundException();
    return { sessao: row.sessao_avaliativa, cabecalho: row.simulado_sessao };
  }

  private async questoesComRespostas(sessaoId: string) {
    const rows = await this.db
      .select({
        itemId: simuladoQuestao.itemId,
        ordem: simuladoQuestao.ordem,
        area: simuladoQuestao.area,
        dificuldade: simuladoQuestao.dificuldade,
        origem: simuladoQuestao.origem,
        enunciado: bancoDeItens.enunciado,
        alternativas: bancoDeItens.alternativas,
        gabarito: bancoDeItens.gabarito,
        respostaDada: tentativaResposta.resposta,
      })
      .from(simuladoQuestao)
      .innerJoin(bancoDeItens, eq(bancoDeItens.id, simuladoQuestao.itemId))
      .leftJoin(
        tentativaResposta,
        and(
          eq(tentativaResposta.sessaoId, simuladoQuestao.sessaoId),
          eq(tentativaResposta.itemId, simuladoQuestao.itemId),
        ),
      )
      .where(eq(simuladoQuestao.sessaoId, sessaoId))
      .orderBy(simuladoQuestao.ordem);

    return rows.map((r) => ({
      ...r,
      alternativas: r.alternativas as { id: string; texto: string }[],
      acerto: r.respostaDada != null && r.respostaDada === r.gabarito,
    }));
  }

  private montarRelatorio(
    sessaoId: string,
    sessao: { iniciadoEm: Date; finalizadoEm: Date | null },
    cabecalho: {
      modo: SimuladoModo;
      limiteMinutos: number | null;
      acertos: number | null;
      xpConcedido: number | null;
      expirado: boolean;
    },
    questoes: Awaited<ReturnType<SimuladoSessaoService['questoesComRespostas']>>,
    bloqueadoPorDesempenho: boolean,
  ): SimuladoRelatorio {
    const total = questoes.length;
    const acertos = cabecalho.acertos ?? questoes.filter((q) => q.acerto).length;
    const emBranco = questoes.filter((q) => q.respostaDada == null).length;

    const agrupar = (chave: (q: (typeof questoes)[number]) => string): SimuladoRecorte[] => {
      const mapa = new Map<string, { acertos: number; total: number }>();
      for (const q of questoes) {
        const k = chave(q);
        const atual = mapa.get(k) ?? { acertos: 0, total: 0 };
        atual.total += 1;
        if (q.acerto) atual.acertos += 1;
        mapa.set(k, atual);
      }
      return [...mapa.entries()].map(([chave, v]) => ({
        chave,
        acertos: v.acertos,
        total: v.total,
        percentual: v.total > 0 ? Math.round((v.acertos / v.total) * 100) : 0,
      }));
    };

    const porArea = agrupar((q) => q.area).sort((a, b) => b.percentual - a.percentual);
    const porDificuldade = agrupar((q) => q.dificuldade);
    const fim = sessao.finalizadoEm ?? new Date();

    return {
      sessaoId,
      modo: cabecalho.modo,
      limiteMinutos: cabecalho.limiteMinutos,
      expirado: cabecalho.expirado,
      total,
      acertos,
      emBranco,
      percentual: total > 0 ? Math.round((acertos / total) * 100) : 0,
      duracaoSegundos: Math.max(0, Math.round((fim.getTime() - sessao.iniciadoEm.getTime()) / 1000)),
      xpGanho: cabecalho.xpConcedido ?? 0,
      xpBloqueadoPorDesempenho: bloqueadoPorDesempenho,
      porArea,
      porDificuldade,
      melhorArea: porArea[0]?.chave ?? null,
      areaAMelhorar: porArea.at(-1)?.chave ?? null,
      questoes: questoes.map((q) => ({
        itemId: q.itemId,
        ordem: q.ordem,
        area: q.area,
        dificuldade: q.dificuldade,
        origem: q.origem,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        respostaDada: q.respostaDada,
        acerto: q.acerto,
      })),
    };
  }
}
