import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GamificacaoModule } from '../gamificacao/gamificacao.module';
import { RedacaoController } from './redacao.controller';
import { RedacaoRepositoryDrizzle } from './redacao.repository.drizzle';
import { RedacaoService } from './redacao.service';
import { REDACAO_REPOSITORY } from './redacao.tokens';

// E7 (Fase 2) — Editor de Redação + Corretor IA (doc 05 §6).
// Consome AiModule (LLM + ContextBuilder) e GamificacaoModule (XP por submissão).
// Persistência real via Drizzle (redacao + avaliacao_redacao + avaliacao_competencia).
@Module({
  imports: [AiModule, GamificacaoModule],
  controllers: [RedacaoController],
  providers: [
    RedacaoService,
    { provide: REDACAO_REPOSITORY, useClass: RedacaoRepositoryDrizzle },
  ],
})
export class RedacaoModule {}
