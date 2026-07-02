import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PoolEsgotadoError, motorTRI } from '@notaa/engine-tri';
import type {
  AreaConhecimento,
  BancoDeItemRegistro,
  ItemPublico,
  QuizRepositoryPort,
  StartQuizSessionResponse,
  SubmitAnswerResponse,
} from '@notaa/contracts';
import { ErrorDetectorService } from '../error-detector/error-detector.service';
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import { ProfilerService } from '../profiler/profiler.service';
import { QUIZ_REPOSITORY } from './quiz.tokens';

const HISTORICO_RECENTE_LIMIT = 10; // baseline comportamental p/ ErrorDetector (E5) — ajustável.

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
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly repo: QuizRepositoryPort,
    private readonly gamificacao: GamificacaoService,
    private readonly profiler: ProfilerService,
    private readonly errorDetector: ErrorDetectorService,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  async generateQuiz(
    estudanteId: string,
    tema: string,
    area: AreaConhecimento,
    dificuldadeDesejada?: 'Fácil' | 'Média' | 'Difícil'
  ): Promise<any> {
    const contexto = await this.contextBuilder.montarContextoSocratico(estudanteId, { temaAtivo: tema });
    
    let nivel_atual_na_area = 50; // default (Média)
    try {
      const areaSafe = area || 'matematica';
      const habilidade = await this.repo.getHabilidade(estudanteId, areaSafe);
      if (habilidade) {
        // Theta padronizado: -3 a +3. Convertendo grosseiramente para escala de 0 a 100
        const prof = Math.round(((habilidade.theta + 3) / 6) * 100);
        nivel_atual_na_area = Math.max(0, Math.min(100, prof));
      }
    } catch (e) {
      // Ignora erro de habilidade não encontrada (primeiro acesso)
    }

    const sistema = `Você é um gerador de Quiz. O aluno tem um nível de proficiência de ${nivel_atual_na_area} (de 0 a 100) nesta área. Gere uma questão TOTALMENTE INÉDITA e criativa sobre ${tema}. O nível de complexidade da questão deve ser proporcional à proficiência do aluno. Retorne estritamente este JSON: { "enunciado": "...", "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."], "correta": 0, "explicacao": "...", "dica_perfil": "dica focada no aluno", "dificuldade": "Fácil|Média|Difícil" }.`;

    const { GenerateQuizResponseSchema } = await import('@notaa/contracts');

    try {
      const { data } = await this.llm.complete({
        sistema,
        contexto,
        schema: GenerateQuizResponseSchema,
      });
      return data;
    } catch (error) {
      throw new BadRequestException({ error: { code: 'AI_ERROR', message: 'Erro interno na inteligência artificial ao gerar questão inédita. Tente novamente em instantes.' }});
    }
  }

  async startSession(
    estudanteId: string,
    area: AreaConhecimento,
  ): Promise<StartQuizSessionResponse> {
    const { theta } = await this.repo.getHabilidade(estudanteId, area);
    const pool = await this.repo.getItemPool(area);

    const { itemId } = this.selecionarProximo(theta, area, [], pool);
    const item = await this.repo.getItem(itemId);
    if (!item) throw new NotFoundException(); // defensivo — pool veio do mesmo repo

    const { sessaoId } = await this.repo.createSession(estudanteId, area);
    return { sessaoId, primeiraQuestao: toItemPublico(item, 1) };
  }

  async nextItem(sessaoId: string, estudanteId: string): Promise<ItemPublico> {
    const sessao = await this.getSessaoDoEstudante(sessaoId, estudanteId);
    const { theta } = await this.repo.getHabilidade(estudanteId, sessao.area);
    const expostos = await this.repo.getExpostos(sessaoId);
    const pool = await this.repo.getItemPool(sessao.area);

    const { itemId } = this.selecionarProximo(theta, sessao.area, expostos, pool);
    const item = await this.repo.getItem(itemId);
    if (!item) throw new NotFoundException();

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
    const { duplicate, tentativaId } = await this.repo.recordAnswer({
      sessaoId,
      estudanteId,
      itemId: body.itemId,
      resposta: body.respostaId,
      acerto,
      tempoRespostaMs: body.tempoRespostaMs,
      idempotencyKey,
      temasErro: !acerto ? [item.competencia] : undefined,
    });

    const habilidadeAtual = await this.repo.getHabilidade(estudanteId, sessao.area);
    let theta = habilidadeAtual.theta;
    let erroPadrao = habilidadeAtual.erroPadrao;
    let xpGanho = 0;
    let classificacaoErro: SubmitAnswerResponse['feedback']['classificacaoErro'] = null;
    // Reenvio idempotente não lança XP de novo → reporta o nível atual sem level-up.
    let gamificacao: SubmitAnswerResponse['gamificacao'] = {
      ...(await this.gamificacao.nivelAtual(estudanteId)),
      subiuDeNivel: false,
    };

    if (!duplicate) {
      const atualizado = motorTRI.updateAbility({
        theta: habilidadeAtual.theta,
        item,
        acerto,
        tempoMs: body.tempoRespostaMs,
      });
      theta = atualizado.theta;
      erroPadrao = atualizado.erroPadrao;
      await this.repo.setHabilidade(estudanteId, sessao.area, theta, erroPadrao, tentativaId ?? undefined);

      xpGanho = acerto ? XP_ACERTO : XP_ERRO;
      const xpResult = await this.gamificacao.grantXp(estudanteId, 'quiz', xpGanho);
      gamificacao = {
        xpTotal: xpResult.xpTotal,
        nivel: xpResult.nivel,
        subiuDeNivel: xpResult.subiuDeNivel,
      };
      await this.gamificacao.registrarAtividadeValida(estudanteId);
      // Atualização silenciosa do perfil 4D (H3.1) — nunca bloqueia a resposta ao cliente.
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
