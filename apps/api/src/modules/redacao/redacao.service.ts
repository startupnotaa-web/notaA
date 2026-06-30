import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  EssayEvaluationSchema,
  type CreateRedacaoRequest,
  type CreateRedacaoResponse,
  type EssayEvaluation,
  type LLMProviderPort,
  type RedacaoStatus,
} from '@notaa/contracts';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import { ContextBuilderService } from '../ai/context-builder.service';
import { RiskDetectorService } from '../ai/risk-detector.service';
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import type { RedacaoRepositoryPort } from './redacao.repository.memory';
import { REDACAO_REPOSITORY } from './redacao.tokens';

// Prompt de sistema para o Corretor de Redação (doc 06 §3).
// Em produção, viria de packages/prompts com versionamento.
const SISTEMA_CORRETOR = `Você é um corretor de redação do ENEM. Regras:
- Avalie EXATAMENTE as 5 competências da rubrica oficial.
- Cada competência recebe nota em múltiplos de 40 (0, 40, 80, 120, 160, 200).
- A nota total é a soma das 5 competências (0 a 1000).
- Cite trechos específicos do texto ao justificar cada nota (guardrail G-R2).
- NUNCA invente competências extras ou omita alguma (guardrail I4).
- Adapte a linguagem do feedback ao perfil cognitivo do estudante.`;

// XP concedido por submissão de redação (doc 04 §7).
const XP_REDACAO = 30;

@Injectable()
export class RedacaoService {
  constructor(
    @Inject(REDACAO_REPOSITORY) private readonly repo: RedacaoRepositoryPort,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
    private readonly contextBuilder: ContextBuilderService,
    private readonly gamificacao: GamificacaoService,
    private readonly risk: RiskDetectorService,
  ) {}

  /**
   * Submete uma redação para correção pela IA (doc 05 §6).
   *
   * Fluxo:
   *   1. Persiste a redação com status `em_correcao`.
   *   2. Monta contexto com Perfil 4D via ContextBuilder.
   *   3. Chama LLM com EssayEvaluationSchema (I4/I5 — exatamente 5 competências).
   *   4. Persiste avaliação e muda status para `corrigida`.
   *   5. Concede XP via gamificação.
   *
   * Em produção (Fase 2), o passo 3 será assíncrono (pg-boss worker, doc 03 §3.3),
   * retornando apenas o ID e status `em_correcao`. Por ora, é síncrono.
   */
  async submeterRedacao(
    estudanteId: string,
    body: CreateRedacaoRequest,
  ): Promise<CreateRedacaoResponse> {
    // 1. Persiste redação.
    const { redacaoId } = await this.repo.criarRedacao({
      estudanteId,
      texto: body.texto,
      temaId: body.temaId,
      temaLivre: body.temaLivre,
    });

    // 1b. Triagem de risco no texto (mesmo protocolo de cuidado da Socrática,
    //     doc 03 §3.3 / I6): se houver sinal, desvia para cuidado humano em vez
    //     de corrigir — usa o status próprio `bloqueada_protocolo`.
    const triagem = this.risk.triagem(body.texto);
    if (triagem.risco) {
      await this.risk.acionarCuidado({
        estudanteId,
        origem: 'redacao',
        referenciaId: redacaoId,
        sinais: triagem.sinais,
        severidade: triagem.severidade,
      });
      await this.repo.atualizarStatus(redacaoId, 'bloqueada_protocolo');
      return { id: redacaoId, status: 'bloqueada_protocolo' };
    }

    try {
      // 2. Monta contexto cognitivo.
      const contexto = await this.contextBuilder.montarContextoRedacao(estudanteId);

      // 3. Chama LLM — schema garante exatamente 5 competências e nota consistente (I4/I5).
      const { data: avaliacaoRaw } = await this.llm.complete({
        sistema: SISTEMA_CORRETOR,
        contexto: { ...contexto, textoRedacao: body.texto },
        schema: EssayEvaluationSchema,
      });

      // 4. Injeta o ID real da redação (o mock retorna um placeholder).
      const avaliacao: EssayEvaluation = {
        ...avaliacaoRaw,
        redacaoId,
        criadoEm: new Date().toISOString(),
      };

      await this.repo.salvarAvaliacao(redacaoId, avaliacao);

      // 5. Concede XP pela redação.
      await this.gamificacao.grantXp(estudanteId, 'redacao', XP_REDACAO);
      await this.gamificacao.registrarAtividadeValida(estudanteId);
    } catch {
      // Em caso de falha na IA, marca como falha sem perder a redação.
      await this.repo.atualizarStatus(redacaoId, 'falha');
      return { id: redacaoId, status: 'falha' };
    }

    return { id: redacaoId, status: 'corrigida' };
  }

  /**
   * Busca a avaliação completa de uma redação (doc 05 §6).
   * 404 se a redação não pertence ao estudante (doc 10 — sem leak de existência).
   */
  async buscarAvaliacao(
    redacaoId: string,
    estudanteId: string,
  ): Promise<EssayEvaluation> {
    const redacao = await this.repo.buscarRedacao(redacaoId);
    if (!redacao || redacao.estudanteId !== estudanteId) {
      throw new NotFoundException();
    }

    const avaliacao = await this.repo.buscarAvaliacao(redacaoId);
    if (!avaliacao) {
      throw new NotFoundException();
    }

    return avaliacao;
  }
}
