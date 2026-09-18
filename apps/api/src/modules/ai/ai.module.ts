import { Module } from '@nestjs/common';
import { ProfilerModule } from '../profiler/profiler.module';
import { LLM_PROVIDER, RISK_REPOSITORY } from './ai.tokens';
import { AiController } from './ai.controller';
import { GeminiAdapter } from './gemini.adapter';
import { StudentProfileService } from './student-profile.service';
import { LlmUsageLoggerProvider } from './llm-usage-logger.provider';
import { CareNotifierService } from './care-notifier.service';
import { RiskDetectorService } from './risk-detector.service';
import { RiskRepositoryDrizzle } from './risk.repository';

/**
 * Módulo transversal de IA (doc 03 §4, doc 06) — portão único de toda chamada
 * de IA generativa. Nenhum outro módulo importa SDK de provedor diretamente.
 *
 * Exporta:
 *   - LLM_PROVIDER (via token) — consumido por todos os canais de IA.
 *   - StudentProfileService — monta o "bloco do aluno" (fatos + como adaptar)
 *     que todo prompt de canal recebe em `{{blocoAluno}}` (packages/prompts).
 *   - RiskDetectorService — triagem determinística de risco (I6).
 *
 * O provedor real (GeminiAdapter, decorado por LlmUsageLoggerProvider) é o ÚNICO
 * ligado ao token LLM_PROVIDER. Não há mock no caminho de execução: falha de IA
 * sobe como erro, nunca vira resposta estática silenciosa.
 */
@Module({
  imports: [ProfilerModule],
  controllers: [AiController],
  providers: [
    // Provedor padrão de produção: Gemini real decorado com o log de uso de IA
    // (log_uso_ia, doc 10 §5) — tokens/custo/latência por chamada.
    { provide: LLM_PROVIDER, useClass: LlmUsageLoggerProvider },
    { provide: RISK_REPOSITORY, useClass: RiskRepositoryDrizzle },
    GeminiAdapter,
    StudentProfileService,
    CareNotifierService,
    RiskDetectorService,
  ],
  // Portão único de IA: fora deste módulo, TODA chamada de IA passa pelo token
  // LLM_PROVIDER (hoje: GeminiAdapter real). GeminiAdapter NÃO é exportado —
  // nenhum outro módulo injeta o adapter diretamente (auditoria E5).
  exports: [LLM_PROVIDER, StudentProfileService, RiskDetectorService],
})
export class AiModule {}
