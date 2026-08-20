import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { motorTRI } from '@notaa/engine-tri';
import { randomUUID } from 'node:crypto';
import type {
  AreaConhecimento,
  BancoDeItemRegistro,
  GenerateQuizResponse,
  ItemPublico,
  QuizRepositoryPort,
  StartQuizSessionResponse,
  SubmitAnswerResponse,
} from '@notaa/contracts';
import { QUIZ_TOTAL_QUESTOES } from '@notaa/contracts';
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

const TEMA_POR_AREA: Record<AreaConhecimento, string> = {
  linguagens: 'competências e habilidades cobradas no ENEM em Linguagens',
  humanas: 'competências e habilidades cobradas no ENEM em Ciências Humanas',
  natureza: 'competências e habilidades cobradas no ENEM em Ciências da Natureza',
  matematica: 'competências e habilidades cobradas no ENEM em Matemática',
  redacao: 'argumentação, repertório e leitura crítica para a redação do ENEM',
  fin: 'educação financeira aplicada ao cotidiano',
  soc: 'competências socioemocionais aplicadas ao estudo',
  art: 'artes e cultura no contexto do ENEM',
};

function dificuldadeParaTheta(theta: number): 'Fácil' | 'Média' | 'Difícil' {
  if (theta <= -0.75) return 'Fácil';
  if (theta >= 0.75) return 'Difícil';
  return 'Média';
}

// ── Escada de dificuldade por sessão ──────────────────────────────────────
// θ só pode ser movido por item calibrado (item 8 da auditoria), e nem as
// questões do ENEM nem as da IA são calibradas. Para o quiz ainda assim se
// adaptar, o degrau vive NA SESSÃO: acertou sobe, errou desce. θ entra só como
// ponto de partida e permanece intacto.
const DEGRAUS = ['facil', 'media', 'dificil'] as const;
type Degrau = (typeof DEGRAUS)[number];

const DEGRAU_PARA_IA: Record<Degrau, 'Fácil' | 'Média' | 'Difícil'> = {
  facil: 'Fácil',
  media: 'Média',
  dificil: 'Difícil',
};

function degrauInicial(theta: number): number {
  if (theta <= -0.75) return 0;
  if (theta >= 0.75) return 2;
  return 1;
}

/** Replay determinístico da sessão: cada acerto +1 degrau, cada erro −1. */
function degrauDaSessao(theta: number, acertos: boolean[]): Degrau {
  let indice = degrauInicial(theta);
  for (const acerto of acertos) {
    indice = Math.min(DEGRAUS.length - 1, Math.max(0, indice + (acerto ? 1 : -1)));
  }
  return DEGRAUS[indice]!;
}


function limparAlternativa(texto: string): string {
  // O prompt pede o conteúdo da opção sem a letra, mas toleramos uma resposta
  // como "A) ..." sem duplicar o marcador na interface.
  return texto.replace(/^\s*[A-Ea-e][\)\.\-:]\s*/, '').trim();
}

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
import { isErroTransitorio } from '../ai/gemini.adapter';
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
    const [habilidade, perguntasRecentes] = await Promise.all([
      this.repo.getHabilidade(estudanteId, area),
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
      nivel: nivelProficiencia,
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
        modelo: process.env.LLM_MODEL_QUIZ ?? process.env.LLM_MODEL_SOCRATICA,
      });
      data = resultado.data;
    } catch (error) {
      this.logger.error(
        `[QUIZ_IA_DIAGNOSTICO] etapa=geracao estudante=${estudanteId} area=${area} tema="${tema}" ` +
          `erro=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : String(error),
      );
      const naoConfigurada = error instanceof Error && error.message.includes('GEMINI_API_KEY não configurado');
      throw new ServiceUnavailableException({
        error: {
          code: naoConfigurada ? 'AI_NOT_CONFIGURED' : 'AI_PROVIDER_UNAVAILABLE',
          message: naoConfigurada
            ? 'A geração de questões por IA ainda não foi configurada no servidor.'
            : 'A IA não conseguiu gerar uma questão agora. Tente novamente em instantes.',
        },
      });
    }

    await this.repo.registrarPerguntaIA(estudanteId, area, tema, data.enunciado);
    return data;
  }

  /**
   * Fluxo do quiz: 100% IA, por decisão de produto. Não há consulta a banco de
   * questões pré-existente — `questoes_enem` serve o Simulado, não o Quiz.
   *
   * A dificuldade vem da escada da sessão (acertou sobe, errou desce), que é o
   * que mantém o quiz adaptativo sem tocar em θ — nenhum item gerado é
   * calibrado, então θ permanece intocado (item 8 da auditoria).
   */
  private async obterProximoItem(
    estudanteId: string,
    sessaoId: string,
    area: AreaConhecimento,
    theta: number,
  ): Promise<BancoDeItemRegistro> {
    const acertos = await this.repo.getAcertosDaSessao(sessaoId).catch(() => [] as boolean[]);
    const degrau = degrauDaSessao(theta, acertos);
    this.logger.log(`[QUIZ_DIAGNOSTICO] origem=ia area=${area} degrau=${degrau}`);
    return this.gerarItemDaIa(estudanteId, area, degrau);
  }

  /**
   * Persistimos o item antes de devolvê-lo porque a submissão precisa recuperar
   * o gabarito no servidor sem expô-lo ao cliente — e porque
   * `tentativa_resposta.item_id` tem FK para `banco_de_itens`.
   */
  private async gerarItemDaIa(estudanteId: string, area: AreaConhecimento, degrau: Degrau) {
    const aiResponse = await this.generateQuiz(
      estudanteId,
      TEMA_POR_AREA[area],
      area,
      DEGRAU_PARA_IA[degrau],
    );
    const letras = ['A', 'B', 'C', 'D', 'E'];
    const novoItem: BancoDeItemRegistro = {
      itemId: randomUUID(),
      area,
      enunciado: aiResponse.enunciado,
      alternativas: aiResponse.alternativas.map((texto, i) => ({
        id: letras[i] ?? 'A',
        texto: limparAlternativa(texto),
      })),
      gabarito: letras[aiResponse.correta] ?? 'A',
      competencia: 'IA_ADAPTATIVA',
      // Sem parâmetros psicométricos calibrados, a tentativa é registrada e
      // recompensada, mas não altera theta (regra já aplicada em submitAnswer).
      naoCalibrado: true,
      paramA: 1,
      paramB: 0,
      paramC: 0.2,
    };
    try {
      await this.repo.addItem(novoItem);
    } catch (error) {
      this.logger.error(
        `[QUIZ_IA_DIAGNOSTICO] etapa=persistencia item=${novoItem.itemId} area=${area} ` +
          `erro=${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
    return novoItem;
  }

  async startSession(
    estudanteId: string,
    area: AreaConhecimento,
  ): Promise<StartQuizSessionResponse> {
    const { theta } = await this.repo.getHabilidade(estudanteId, area);
    // Sessão criada ANTES da 1ª questão: o degrau é derivado a partir dela
    // (ainda sem respostas aqui, então parte do θ).
    const { sessaoId } = await this.repo.createSession(estudanteId, area);
    const item = await this.obterProximoItem(estudanteId, sessaoId, area, theta);
    return { sessaoId, primeiraQuestao: toItemPublico(item, 1) };
  }

  async nextItem(sessaoId: string, estudanteId: string): Promise<ItemPublico> {
    const sessao = await this.getSessaoDoEstudante(sessaoId, estudanteId);
    const { theta } = await this.repo.getHabilidade(estudanteId, sessao.area);
    const expostos = await this.repo.getExpostos(sessaoId);
    const item = await this.obterProximoItem(estudanteId, sessaoId, sessao.area, theta);
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

    // `expostos` é lido DEPOIS da transação, então já inclui a questão recém
    // respondida — é a contagem de quantas o aluno completou nesta sessão.
    const expostos = await this.repo.getExpostos(sessaoId);
    const chegouAoFim = expostos.length >= QUIZ_TOTAL_QUESTOES;

    let proximaQuestao: ItemPublico | null = null;
    if (chegouAoFim) {
      // Encerra no servidor em vez de depender do POST /finish do cliente, que é
      // best-effort — sessão abandonada no meio não deve ficar 'em_andamento'.
      await this.repo.finishSession(sessaoId);
    } else {
      const proximoItem = await this.obterProximoItem(estudanteId, sessaoId, sessao.area, theta);
      proximaQuestao = toItemPublico(proximoItem, expostos.length + 1);
    }

    return {
      acerto,
      gabarito: item.gabarito,
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

  /** 404 (não 403) para não confirmar a existência de sessão de outro usuário (doc 10). */
  private async getSessaoDoEstudante(sessaoId: string, estudanteId: string) {
    const sessao = await this.repo.getSession(sessaoId);
    if (!sessao || sessao.estudanteId !== estudanteId) {
      throw new NotFoundException();
    }
    return sessao;
  }
}
