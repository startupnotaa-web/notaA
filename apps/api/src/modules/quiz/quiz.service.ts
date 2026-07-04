import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PoolEsgotadoError, motorTRI } from '@notaa/engine-tri';
import type {
  AreaConhecimento,
  BancoDeItemRegistro,
  GenerateQuizResponse,
  ItemPublico,
  QuizRepositoryPort,
  StartQuizSessionResponse,
  SubmitAnswerResponse,
} from '@notaa/contracts';
import { PROMPT_QUIZ_TEMPLATE, montarPromptQuiz } from '@notaa/prompts';
import { ErrorDetectorService } from '../error-detector/error-detector.service';
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import { ProfilerService } from '../profiler/profiler.service';
import { QUIZ_REPOSITORY } from './quiz.tokens';
import { QuizUnitOfWork } from './quiz.unit-of-work';

const HISTORICO_RECENTE_LIMIT = 10; // baseline comportamental p/ ErrorDetector (E5) — ajustável.
const HISTORICO_PERGUNTAS_IA_LIMIT = 8; // anti-repetição do Quiz com IA (Missão 1).
const QUIZ_IA_TEMPERATURE = 1.1; // acima do default do Gemini — reduz colisão com o histórico recente.

// XP por resposta — heurística de produto (não é dado oficial a calibrar,
// diferente dos parâmetros TRI). Ajustável sem impacto em Q-02/03/06.
const XP_ACERTO = 15;
const XP_ERRO = 5;

function toItemPublico(item: BancoDeItemRegistro, numero: number): ItemPublico {
  // SEM gabarito — segurança (H2.1, doc 08).
  return {
    itemId: item.itemId,
    area: item.area,
    enunciado: item.enunciado,
    alternativas: item.alternativas,
    numero,
  };
}

import { ContextBuilderService } from '../ai/context-builder.service';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import type { LLMProviderPort } from '@notaa/contracts';

@Injectable()
export class QuizService {
  private readonly logger = new Logger('QuizService');

  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly repo: QuizRepositoryPort,
    private readonly gamificacao: GamificacaoService,
    private readonly profiler: ProfilerService,
    private readonly errorDetector: ErrorDetectorService,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
    private readonly contextBuilder: ContextBuilderService,
    private readonly uow: QuizUnitOfWork,
  ) {}

  async generateQuiz(
    estudanteId: string,
    tema: string,
    area: AreaConhecimento,
    dificuldadeDesejada?: 'Fácil' | 'Média' | 'Difícil',
  ): Promise<GenerateQuizResponse> {
    const [habilidade, nivelGamificacao, perguntasRecentes] = await Promise.all([
      this.repo.getHabilidade(estudanteId, area),
      this.gamificacao.nivelAtual(estudanteId),
      this.repo.getHistoricoPerguntasIA(estudanteId, area, HISTORICO_PERGUNTAS_IA_LIMIT),
    ]);

    // Theta padronizado: -3 a +3. Convertendo para escala de proficiência 0-100.
    const nivelProficiencia = Math.max(0, Math.min(100, Math.round(((habilidade.theta + 3) / 6) * 100)));

    const contexto = await this.contextBuilder.montarContextoSocratico(estudanteId, {
      temaAtivo: tema,
      historico: perguntasRecentes,
    }) as any;

    const instrucaoDificuldade = dificuldadeDesejada
      ? `A dificuldade solicitada pelo aluno é "${dificuldadeDesejada}".`
      : 'A dificuldade deve ser proporcional à proficiência do aluno.';
    const instrucaoAntiRepeticao =
      perguntasRecentes.length > 0
        ? 'O campo "historicoRecente" do contexto traz as últimas questões já geradas para este aluno nesta área — NUNCA repita, parafraseie ou gere uma variação óbvia de nenhuma delas; explore um subtema, ângulo ou formato diferente.'
        : '';

    const instrucoes = contexto.instrucoesPedagogicas?.length > 0 
      ? contexto.instrucoesPedagogicas.join(', ') 
      : 'Visual e Prático';
    const objetivo = contexto.objetivoAluno || 'mandar bem nos estudos';

    const sistema = montarPromptQuiz({
      instrucoes,
      objetivo,
      nivel: nivelGamificacao.nivel,
      area,
      tema,
      instrucaoDificuldade,
      instrucaoAntiRepeticao,
    });

    const { GenerateQuizResponseSchema } = await import('@notaa/contracts');

    let data: GenerateQuizResponse;
    try {
      const resultado = await this.llm.complete({
        sistema,
        contexto,
        schema: GenerateQuizResponseSchema,
        temperature: QUIZ_IA_TEMPERATURE,
        origem: 'quiz',
        usuarioId: estudanteId,
        promptVersao: PROMPT_QUIZ_TEMPLATE.versao,
      });
      data = resultado.data;
    } catch (error) {
      this.logger.error(
        `Falha ao gerar quiz via IA (estudante=${estudanteId}, area=${area}, tema="${tema}")`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException({
        error: {
          code: 'AI_ERROR',
          message: 'Erro interno na inteligência artificial ao gerar questão inédita. Tente novamente em instantes.',
        },
      });
    }

    await this.repo.registrarPerguntaIA(estudanteId, area, tema, data.enunciado);
    return data;
  }

  private async getOrGenerateNextItem(
    estudanteId: string,
    area: AreaConhecimento,
    theta: number,
    expostos: string[],
    pool: BancoDeItemRegistro[]
  ) {
    try {
      const { itemId } = this.selecionarProximo(theta, area, expostos, pool);
      const item = await this.repo.getItem(itemId);
      if (!item) throw new NotFoundException();
      return item;
    } catch (err) {
      if (err instanceof PoolEsgotadoError) {
        const aiResponse = await this.generateQuiz(estudanteId, 'Questão Adaptativa', area);
        const letras = ['A', 'B', 'C', 'D', 'E'];
        const novoItem: BancoDeItemRegistro = {
          itemId: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          area: area,
          enunciado: aiResponse.enunciado,
          alternativas: aiResponse.alternativas.map((texto, i) => ({ id: letras[i] ?? 'A', texto })),
          gabarito: letras[aiResponse.correta] ?? 'A',
          competencia: 'IA_ADAPTATIVA',
          naoCalibrado: true,
          paramA: 1.2,
          paramB: aiResponse.dificuldade === 'Fácil' ? -1 : aiResponse.dificuldade === 'Média' ? 0 : 1.5,
          paramC: 0.2,
        };
        await this.repo.addItem(novoItem);
        return novoItem;
      }
      throw err;
    }
  }

  async startSession(
    estudanteId: string,
    area: AreaConhecimento,
  ): Promise<StartQuizSessionResponse> {
    const { theta } = await this.repo.getHabilidade(estudanteId, area);
    const pool = await this.repo.getItemPool(area);

    const item = await this.getOrGenerateNextItem(estudanteId, area, theta, [], pool);
    const { sessaoId } = await this.repo.createSession(estudanteId, area);
    return { sessaoId, primeiraQuestao: toItemPublico(item, 1) };
  }

  async nextItem(sessaoId: string, estudanteId: string): Promise<ItemPublico> {
    const sessao = await this.getSessaoDoEstudante(sessaoId, estudanteId);
    const { theta } = await this.repo.getHabilidade(estudanteId, sessao.area);
    const expostos = await this.repo.getExpostos(sessaoId);
    const pool = await this.repo.getItemPool(sessao.area);

    const item = await this.getOrGenerateNextItem(estudanteId, sessao.area, theta, expostos, pool);
    return toItemPublico(item, expostos.length + 1);
  }

  async submitAnswer(
    sessaoId: string,
    estudanteId: string,
    body: { itemId: string; respostaId: string; tempoRespostaMs: number },
    idempotencyKey: string,
  ): Promise<SubmitAnswerResponse> {
    const sessao = await this.getSessaoDoEstudante(sessaoId, estudanteId);
    if (sessao.status !== 'em_andamento') {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'Sessão não está em andamento.' },
      });
    }

    const item = await this.repo.getItem(body.itemId);
    if (!item) throw new NotFoundException();

    const acerto = body.respostaId === item.gabarito;
    // Buscado ANTES de recordAnswer — baseline do estudante sem a tentativa atual (doc 09 §6).
    const historicoRecente = await this.repo.getHistoricoRecente(
      estudanteId,
      sessao.area,
      HISTORICO_RECENTE_LIMIT,
    );
    // Núcleo transacional (auditoria E7): tentativa + theta + XP + streak são
    // atômicos — falha no meio reverte tudo (inclusive a tentativa, liberando a
    // idempotencyKey para o reenvio refazer o fluxo completo).
    const nucleo = await this.uow.run(async ({ quizRepo, gamificacao }) => {
      const { duplicate, tentativaId } = await quizRepo.recordAnswer({
        sessaoId,
        estudanteId,
        itemId: body.itemId,
        resposta: body.respostaId,
        acerto,
        tempoRespostaMs: body.tempoRespostaMs,
        idempotencyKey,
        temasErro: !acerto ? [item.competencia] : undefined,
      });

      const habilidadeAtual = await quizRepo.getHabilidade(estudanteId, sessao.area);
      if (duplicate) {
        // Reenvio idempotente não lança XP de novo → reporta o nível atual sem level-up.
        return {
          duplicate,
          theta: habilidadeAtual.theta,
          erroPadrao: habilidadeAtual.erroPadrao,
          xpGanho: 0,
          gamificacao: { ...(await gamificacao.nivelAtual(estudanteId)), subiuDeNivel: false },
        };
      }

      // Item NÃO calibrado (ex.: gerado por IA com parâmetros TRI chutados) não
      // pode mover a estimativa de habilidade — theta só é alimentado por itens
      // calibrados (regra do planejamento §1.2 / auditoria E8). A tentativa e o
      // XP seguem normais; apenas a atualização de theta é pulada.
      let atualizado = { theta: habilidadeAtual.theta, erroPadrao: habilidadeAtual.erroPadrao };
      if (item.naoCalibrado) {
        this.logger.warn(
          `Item ${item.itemId} não calibrado — tentativa registrada sem atualizar theta (estudante=${estudanteId}).`,
        );
      } else {
        atualizado = motorTRI.updateAbility({
          theta: habilidadeAtual.theta,
          item,
          acerto,
          tempoMs: body.tempoRespostaMs,
        });
        await quizRepo.setHabilidade(
          estudanteId,
          sessao.area,
          atualizado.theta,
          atualizado.erroPadrao,
          tentativaId ?? undefined,
        );
      }

      const xpGanho = acerto ? XP_ACERTO : XP_ERRO;
      const xpResult = await gamificacao.grantXp(estudanteId, 'quiz', xpGanho);
      await gamificacao.registrarAtividadeValida(estudanteId);

      return {
        duplicate,
        theta: atualizado.theta,
        erroPadrao: atualizado.erroPadrao,
        xpGanho,
        gamificacao: {
          xpTotal: xpResult.xpTotal,
          nivel: xpResult.nivel,
          subiuDeNivel: xpResult.subiuDeNivel,
        },
      };
    });
    const { theta, erroPadrao, xpGanho, gamificacao } = nucleo;

    let classificacaoErro: SubmitAnswerResponse['feedback']['classificacaoErro'] = null;
    if (!nucleo.duplicate) {
      // Fora da transação: análises derivadas não podem reverter a resposta já
      // efetivada (H3.1 — "nunca bloqueia a resposta ao cliente").
      await this.profiler.atualizarComRespostaQuiz(estudanteId, {
        tempoMs: body.tempoRespostaMs,
        acerto,
      });

      // Detector de Padrão de Erro (H5.1) — só faz sentido classificar um erro de fato.
      if (!acerto) {
        const resultado = await this.errorDetector.classificarErro({
          estudanteId,
          item,
          tempoMs: body.tempoRespostaMs,
          historicoRecente,
        });
        classificacaoErro = resultado.classificacao;
      }
    }

    const expostos = await this.repo.getExpostos(sessaoId);
    const pool = await this.repo.getItemPool(sessao.area);
    let proximaQuestao: ItemPublico | null = null;
    try {
      const { itemId } = this.selecionarProximo(theta, sessao.area, expostos, pool);
      const proximoItem = await this.repo.getItem(itemId);
      if (proximoItem) proximaQuestao = toItemPublico(proximoItem, expostos.length + 1);
    } catch (e) {
      if (!(e instanceof PoolEsgotadoError)) throw e;
      proximaQuestao = null; // pool esgotado — fim natural do quiz nesta área
    }

    return {
      acerto,
      theta,
      erroPadrao,
      xpGanho,
      gamificacao,
      feedback: { classificacaoErro },
      proximaQuestao,
    };
  }

  async finishSession(sessaoId: string, estudanteId: string): Promise<{ status: 'concluida' }> {
    await this.getSessaoDoEstudante(sessaoId, estudanteId);
    await this.repo.finishSession(sessaoId);
    return { status: 'concluida' };
  }

  private selecionarProximo(
    theta: number,
    area: AreaConhecimento,
    expostos: string[],
    pool: BancoDeItemRegistro[],
  ) {
    return motorTRI.selectNextItem({ theta, area, expostos, pool });
  }

  /** 404 (não 403) para não confirmar a existência de sessão de outro usuário (doc 10). */
  private async getSessaoDoEstudante(sessaoId: string, estudanteId: string) {
    const sessao = await this.repo.getSession(sessaoId);
    if (!sessao || sessao.estudanteId !== estudanteId) {
      throw new NotFoundException();
    }
    return sessao;
  }
}
