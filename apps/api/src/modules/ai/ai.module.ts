import { Module } from '@nestjs/common';
import { ProfilerModule } from '../profiler/profiler.module';
import { PROFILER_REPOSITORY } from '../profiler/profiler.tokens';
import { LLM_PROVIDER, RISK_REPOSITORY } from './ai.tokens';
import { ContextBuilderService } from './context-builder.service';
import { LLMProviderMock } from './llm-provider.mock';
import { RiskDetectorService } from './risk-detector.service';
import { RiskRepositoryDrizzle } from './risk.repository';

/**
 * Módulo transversal de IA (doc 03 §4, doc 06) — portão único de toda chamada
 * de IA generativa. Nenhum outro módulo importa SDK de provedor diretamente.
 *
 * Exporta:
 *   - LLM_PROVIDER (via token) — consumido por SocraticService e RedacaoService.
 *   - ContextBuilderService — monta o pacote de contexto (Perfil 4D + adaptações).
 *
 * Para trocar o provedor mock por um real:
 *   1. Crie o adaptador (ex.: `gemini.adapter.ts`) implementando `LLMProviderPort`.
 *   2. Mude `useClass: LLMProviderMock` → `useClass: GeminiAdapter` abaixo.
 *   3. Nenhum outro arquivo muda.
 */
@Module({
  imports: [ProfilerModule],
  providers: [
    // TODO (Fase 2): trocar por adaptador real quando o provedor de IA for escolhido.
    { provide: LLM_PROVIDER, useClass: LLMProviderMock },
    { provide: RISK_REPOSITORY, useClass: RiskRepositoryDrizzle },
    ContextBuilderService,
    RiskDetectorService,
  ],
  exports: [LLM_PROVIDER, ContextBuilderService, RiskDetectorService],
})
export class AiModule {}
