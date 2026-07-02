import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SocraticResponseSchema, type LLMProviderPort, type SocraticResponse } from '@notaa/contracts';
import { LLM_PROVIDER } from '../ai/ai.tokens';
import { ContextBuilderService } from '../ai/context-builder.service';
import { GeminiAdapter } from '../ai/gemini.adapter';
import { StudentContextService } from '../ai/student-context.service';
import { fallbackGuiado } from '../ai/guardrails';
import { RiskDetectorService } from '../ai/risk-detector.service';
import type { SocraticRepositoryPort } from './socratic.repository.memory';
import { SOCRATIC_REPOSITORY } from './socratic.tokens';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, assinatura, plano, eq, desc } from '@notaa/db';

// Prompt de sistema versionado — em produção, viria de packages/prompts (doc 06 §2.2).
const SISTEMA_SOCRATICO = `Você é um tutor socrático para estudantes do ENEM. Regras:
- NUNCA dê a resposta direta (guardrail I3).
- Guie o raciocínio com perguntas progressivas.
- Adapte a linguagem ao perfil cognitivo do estudante (fornecido no contexto).
- Se detectar sofrimento emocional, redirecione para suporte humano (care_protocol).`;

@Injectable()
export class SocraticService {
  private readonly logger = new Logger('SocraticService');

  constructor(
    @Inject(SOCRATIC_REPOSITORY) private readonly repo: SocraticRepositoryPort,
    @Inject(DB_CLIENT) private readonly db: Database,
    @Inject(LLM_PROVIDER) private readonly llm: LLMProviderPort,
    private readonly contextBuilder: ContextBuilderService,
    private readonly risk: RiskDetectorService,
    private readonly gemini: GeminiAdapter,
    private readonly studentContext: StudentContextService,
  ) {}

  /**
   * Agente 3 — tutor socrático DIRETO (POST /socratic/chat): stateless, usa o
   * Gemini REAL (não o LLM_PROVIDER mock) com um system prompt em linguagem
   * natural montado pelo StudentContextService (onboarding + Perfil 4D).
   *
   * Mantém a triagem de risco da ENTRADA (I6, doc 01 §1.5): segurança não é
   * opcional num canal aluno↔IA. Sem conversa persistida aqui, a ocorrência
   * referencia o próprio estudante (referencia_id é uuid notNull).
   */
  async chatDireto(
    estudanteId: string,
    mensagem: string,
  ): Promise<{ resposta: string; origem: 'gemini' | 'care_protocol' }> {
    const triagem = this.risk.triagem(mensagem);
    if (triagem.risco) {
      const cuidado = await this.risk.acionarCuidado({
        estudanteId,
        origem: 'socratica',
        referenciaId: estudanteId,
        sinais: triagem.sinais,
        severidade: triagem.severidade,
      });
      return { resposta: cuidado.mensagem, origem: 'care_protocol' };
    }

    const systemPrompt = await this.studentContext.buildSocraticSystemPrompt(estudanteId);
    const resposta = await this.gemini.generateSocraticResponse(mensagem, systemPrompt);
    return { resposta, origem: 'gemini' };
  }

  /**
   * Abre uma nova sessão de conversa socrática (doc 05 §7).
   * Pode ser vinculada a uma sessão de quiz (para contexto de questão) ou
   * ser livre (temaAtivo fornecido pelo estudante).
   */
  async abrirSessao(
    estudanteId: string,
    input: { temaAtivo?: string; sessaoId?: string },
  ): Promise<{ conversaId: string }> {
    await this.checkAndEnforceFreemiumLimits(estudanteId);

    const { conversaId } = await this.repo.criarConversa({
      estudanteId,
      temaAtivo: input.temaAtivo,
      sessaoId: input.sessaoId,
    });

    // Mensagem de sistema inicial (invisível ao estudante, usada como contexto).
    await this.repo.adicionarMensagem({
      conversaId,
      papel: 'sistema',
      conteudo: `Sessão aberta. Tema: ${input.temaAtivo ?? 'livre'}.`,
    });

    return { conversaId };
  }

  /**
   * Envia mensagem do estudante e gera resposta do tutor via LLM.
   * O Perfil 4D é injetado automaticamente pelo ContextBuilder — o estudante
   * não precisa (e nem pode) fornecer seu próprio contexto cognitivo.
   */
  async enviarMensagem(
    conversaId: string,
    estudanteId: string,
    mensagem: string,
  ): Promise<SocraticResponse> {
    const conversa = await this.getConversaDoEstudante(conversaId, estudanteId);

    // 1. Persiste a mensagem do estudante (mantém o registro mesmo no desvio de risco).
    await this.repo.adicionarMensagem({
      conversaId,
      papel: 'estudante',
      conteudo: mensagem,
    });

    // 2. Triagem de risco ANTES do LLM (I6, doc 01 §1.5) — decisão determinística
    //    desta camada, não do provedor. Se acusar, desvia para o protocolo de
    //    cuidado humano e NÃO continua a tutoria normal.
    const triagem = this.risk.triagem(mensagem);
    if (triagem.risco) {
      const resposta = await this.risk.acionarCuidado({
        estudanteId,
        origem: 'socratica',
        referenciaId: conversaId,
        sinais: triagem.sinais,
        severidade: triagem.severidade,
      });
      await this.repo.adicionarMensagem({
        conversaId,
        papel: 'tutor',
        conteudo: resposta.mensagem,
        estadoMaquina: 'care_protocol',
      });
      return resposta;
    }

    // 3. Monta contexto completo (Perfil 4D + histórico + tema) e chama o LLM (I5).
    const historicoMensagens = await this.repo.listarMensagens(conversaId);
    const historico = historicoMensagens
      .filter((m) => m.papel !== 'sistema')
      .map((m) => `${m.papel}: ${m.conteudo}`);

    const contexto = await this.contextBuilder.montarContextoSocratico(estudanteId, {
      temaAtivo: conversa.temaAtivo ?? undefined,
      historico,
    });

    const { data: respostaLLM } = await this.llm.complete({
      sistema: SISTEMA_SOCRATICO,
      prompt: mensagem,
      contexto,
      schema: SocraticResponseSchema,
    });

    // 4. Guardrails pós-LLM (defesa em profundidade).
    let resposta: SocraticResponse = respostaLLM;
    if (resposta.tipo === 'care_protocol') {
      // O LLM levantou cuidado por conta própria — registra/escala, não só devolve.
      await this.risk.registrarOcorrencia({
        estudanteId,
        origem: 'socratica',
        referenciaId: conversaId,
        sinal: 'care_protocol_llm',
        severidade: resposta.escalonamento === 'responsavel_escola' ? 'alta' : 'media',
        escalonamento: resposta.escalonamento,
        fonte: 'resposta_llm',
      });
    } else if (resposta.tipo === 'guidance' && this.risk.contemRespostaDireta(resposta.mensagem)) {
      // I3: a guidance tentou entregar a resposta final — rebaixa para fallback guiado.
      this.logger.warn(
        'Guardrail I3: resposta direta detectada na guidance — rebaixando para degraded_static.',
      );
      resposta = fallbackGuiado();
    }

    // 5. Persiste a resposta do tutor.
    await this.repo.adicionarMensagem({
      conversaId,
      papel: 'tutor',
      conteudo: resposta.mensagem,
      estadoMaquina: resposta.tipo === 'guidance' ? resposta.estado : resposta.tipo,
    });

    return resposta;
  }

  /**
   * Retorna o histórico de mensagens da conversa (sem mensagens de sistema).
   */
  async listarMensagens(conversaId: string, estudanteId: string) {
    await this.getConversaDoEstudante(conversaId, estudanteId);
    const todas = await this.repo.listarMensagens(conversaId);
    return todas.filter((m) => m.papel !== 'sistema');
  }

  /**
   * Retorna o histórico de conversas socráticas (limitado a 3 para free).
   */
  async listarHistorico(estudanteId: string) {
    return this.repo.listarConversas(estudanteId);
  }

  private async checkAndEnforceFreemiumLimits(estudanteId: string) {
    const [assinaturaRecord] = await this.db
      .select({ tipo: plano.tipo })
      .from(assinatura)
      .innerJoin(plano, eq(plano.id, assinatura.planoId))
      .where(eq(assinatura.usuarioId, estudanteId))
      .orderBy(desc(assinatura.vigenciaInicio))
      .limit(1);

    const isPremium = assinaturaRecord && (assinaturaRecord.tipo === 'plus' || assinaturaRecord.tipo === 'escola');
    if (!isPremium) {
      // Deleta as mais antigas para que o usuário possa inserir uma nova sem passar de 3
      await this.repo.manterLimiteSocratico(estudanteId, 3);
    }
  }

  /** 404 (não 403) para não confirmar existência de conversa de outro usuário (doc 10). */
  private async getConversaDoEstudante(conversaId: string, estudanteId: string) {
    const conversa = await this.repo.buscarConversa(conversaId);
    if (!conversa || conversa.estudanteId !== estudanteId) {
      throw new NotFoundException();
    }
    return conversa;
  }
}
