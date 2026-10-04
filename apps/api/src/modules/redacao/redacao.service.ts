import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  EssayEvaluationSchema,
  type CreateRedacaoRequest,
  type CreateRedacaoResponse,
  type EssayEvaluation,
  type LLMProviderPort,
  type RedacaoStatus,
} from '@notaa/contracts';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import { StudentProfileService } from '../ai/student-profile.service';
import { isErroTransitorio } from '../ai/gemini.adapter';
import { RiskDetectorService } from '../ai/risk-detector.service';
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import type { RedacaoRepositoryPort } from './redacao.repository.memory';
import { REDACAO_REPOSITORY } from './redacao.tokens';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, assinatura, plano, temaRedacao, eq, desc } from '@notaa/db';
import { PROMPT_CORRETOR_REDACAO, montarPromptCorretorRedacao } from '@notaa/prompts';

// XP concedido por submissão de redação (doc 04 §7).
const XP_REDACAO = 30;

@Injectable()
export class RedacaoService {
  private readonly logger = new Logger('RedacaoService');

  constructor(
    @Inject(REDACAO_REPOSITORY) private readonly repo: RedacaoRepositoryPort,
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
    private readonly studentProfile: StudentProfileService,
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
    await this.checkAndEnforceFreemiumLimits(estudanteId);

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
      // 2. Bloco do aluno (muda só o feedback, nunca a nota) + tema da proposta:
      //    sem o tema, a Competência 2 seria avaliada às cegas.
      const [blocoAluno, tema] = await Promise.all([
        this.studentProfile.montarBloco(estudanteId, 'redacao'),
        this.resolverTema(body),
      ]);

      // 3. Chama LLM — schema garante exatamente 5 competências e nota consistente (I4/I5).
      const { data: avaliacaoRaw } = await this.llm.complete({
        sistema: montarPromptCorretorRedacao({ blocoAluno }),
        contexto: { propostaDeRedacao: tema, textoDoAluno: body.texto },
        schema: EssayEvaluationSchema,
        origem: 'redacao',
        usuarioId: estudanteId,
        promptVersao: PROMPT_CORRETOR_REDACAO.versao,
        modelo: process.env.LLM_MODEL_REDACAO,
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
    } catch (error) {
      // Em caso de falha na IA (já re-tentada pelo adapter), marca como falha
      // sem perder a redação — o aluno pode reenviar. O log é o que permite
      // diagnosticar a causa em produção (timeout? 429? schema?) — auditoria E6.
      // Diferencia no log falha transitória do provedor (rede/429/5xx — o
      // reenvio do aluno tem chance real de funcionar) de falha não-transitória
      // (config/schema/modelo inexistente — reenviar não resolve, é bug nosso).
      const causa = isErroTransitorio(error) ? 'transitória (provedor)' : 'não-transitória (config/schema)';
      this.logger.error(
        `Falha ao corrigir redação ${redacaoId} (estudante=${estudanteId}) — causa ${causa}`,
        error instanceof Error ? error.stack : String(error),
      );
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

  /**
   * Retorna o histórico de redações submetidas pelo estudante.
   */
  async listarHistorico(estudanteId: string) {
    return this.repo.listarRedacoes(estudanteId);
  }

  /**
   * Proposta de redação como o corretor precisa ver: título e texto motivador
   * do tema cadastrado, ou o tema livre digitado pelo aluno. Sem nenhum dos
   * dois, o corretor é avisado explicitamente (não finge que sabe o tema).
   */
  private async resolverTema(
    body: CreateRedacaoRequest,
  ): Promise<{ titulo: string; textoMotivador: string | null } | { temaLivre: string } | { aviso: string }> {
    if (body.temaId) {
      try {
        const [tema] = await this.db
          .select({ titulo: temaRedacao.titulo, textoMotivador: temaRedacao.textoMotivador })
          .from(temaRedacao)
          .where(eq(temaRedacao.id, body.temaId))
          .limit(1);
        if (tema) return { titulo: tema.titulo, textoMotivador: tema.textoMotivador ?? null };
      } catch (err) {
        this.logger.warn(`tema_redacao ${body.temaId} indisponível: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (body.temaLivre?.trim()) return { temaLivre: body.temaLivre.trim() };
    return { aviso: 'Tema não informado: avalie a Competência 2 pela coerência interna do texto e diga isso na justificativa.' };
  }

  private async checkAndEnforceFreemiumLimits(estudanteId: string) {
    const [assinaturaRecord] = await this.db
      .select({ tipo: plano.tipo })
      .from(assinatura)
      .innerJoin(plano, eq(plano.id, assinatura.planoId))
      .where(eq(assinatura.usuarioId, estudanteId))
      .orderBy(desc(assinatura.vigenciaInicio))
      .limit(1);

    const isPremium = assinaturaRecord && (assinaturaRecord.tipo === 'plus' || assinaturaRecord.tipo === 'instituicao');
    if (!isPremium) {
      await this.repo.manterLimiteRedacao(estudanteId, 3);
    }
  }
}
