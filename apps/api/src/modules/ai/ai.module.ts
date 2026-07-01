import { Module } from '@nestjs/common';
import { ProfilerModule } from '../profiler/profiler.module';
import { PROFILER_REPOSITORY } from '../profiler/profiler.tokens';
import { LLM_PROVIDER, RISK_REPOSITORY } from './ai.tokens';
import { AiController } from './ai.controller';
import { ContextBuilderService } from './context-builder.service';
import { GeminiAdapter } from './gemini.adapter';
import { StudentContextService } from './student-context.service';
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
  controllers: [AiController],
  providers: [
    // Provedor padrão de produção: ainda o mock. O GeminiAdapter já está pronto
    // e injetável (usado por /ai/test); para promovê-lo, troque o useClass abaixo
    // por `GeminiAdapter` — nenhum consumidor de LLM_PROVIDER muda.
    { provide: LLM_PROVIDER, useClass: LLMProviderMock },
    { provide: RISK_REPOSITORY, useClass: RiskRepositoryDrizzle },
    GeminiAdapter,
    StudentContextService,
    ContextBuilderService,
    RiskDetectorService,
  ],
  // GeminiAdapter + StudentContextService exportados para o SocraticModule
  // (POST /socratic/chat). LLM_PROVIDER segue sendo o mock por padrão.
  exports: [
    LLM_PROVIDER,
    ContextBuilderService,
    RiskDetectorService,
    GeminiAdapter,
    StudentContextService,
  ],
})
export class AiModule {}
