import { Injectable } from '@nestjs/common';
import type { PerfilCognitivoState } from '@notaa/contracts';
import { ProfilerService } from '../profiler/profiler.service';

/**
 * Context Builder (doc 06 §2) — monta o pacote de contexto injetado em toda
 * chamada de IA generativa. Nunca é o cliente quem fornece o contexto; é esta
 * camada que o constrói a partir dos dados do estudante (Perfil 4D, histórico,
 * adaptações ativas).
 *
 * Por que separar do LLMProviderPort?
 *   - O Provider é stateless e agnóstico de domínio (só faz complete()).
 *   - O ContextBuilder é stateful e carrega todo o conhecimento do estudante.
 *   - Trocar de Provider (ex.: Gemini → Claude) NÃO muda o contexto.
 *   - Trocar a lógica de contexto (ex.: adicionar histórico de erros) NÃO muda o Provider.
 */
@Injectable()
export class ContextBuilderService {
  constructor(private readonly profiler: ProfilerService) {}

  /**
   * Monta o contexto completo do estudante para a IA Socrática (doc 06 §2).
   * Inclui Perfil 4D + recomendações ativas + tema/questão em foco.
   */
  async montarContextoSocratico(
    estudanteId: string,
    extras: { temaAtivo?: string; historico?: string[] },
  ): Promise<object> {
    const perfilResponse = await this.profiler.getPerfil(estudanteId);

    return {
      perfilCognitivo: {
        eixoVisualVerbal: perfilResponse.eixoVisualVerbal,
        eixoAnaliticoHolistico: perfilResponse.eixoAnaliticoHolistico,
        eixoSequencialAleatorio: perfilResponse.eixoSequencialAleatorio,
        eixoReflexivoImpulsivo: perfilResponse.eixoReflexivoImpulsivo,
        confianca: perfilResponse.confianca,
      },
      recomendacoesAtivas: perfilResponse.recomendacoesAtivas,
      temaAtivo: extras.temaAtivo ?? null,
      historicoRecente: extras.historico ?? [],
    };
  }

  /**
   * Monta o contexto para o Corretor de Redação (doc 06 §3).
   * Mais simples que o socrático — não precisa de histórico de conversa.
   */
  async montarContextoRedacao(estudanteId: string): Promise<object> {
    const perfilResponse = await this.profiler.getPerfil(estudanteId);

    return {
      perfilCognitivo: {
        eixoVisualVerbal: perfilResponse.eixoVisualVerbal,
        eixoAnaliticoHolistico: perfilResponse.eixoAnaliticoHolistico,
        eixoSequencialAleatorio: perfilResponse.eixoSequencialAleatorio,
        eixoReflexivoImpulsivo: perfilResponse.eixoReflexivoImpulsivo,
        confianca: perfilResponse.confianca,
      },
      // O feedback de redação é adaptado ao perfil — um aluno Visual recebe
      // sugestões mais diagramáticas; um Verbal recebe reformulações textuais.
      recomendacoesAtivas: perfilResponse.recomendacoesAtivas,
    };
  }
}
