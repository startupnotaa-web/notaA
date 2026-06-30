import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SocraticController } from './socratic.controller';
import { SocraticRepositoryDrizzle } from './socratic.repository.drizzle';
import { SocraticService } from './socratic.service';
import { SOCRATIC_REPOSITORY } from './socratic.tokens';

// E8 (Fase 2) — IA Socrática (doc 05 §7). Consome AiModule (LLM + ContextBuilder).
// Persistência real via Drizzle (conversa_socratica + mensagem_socratica).
@Module({
  imports: [AiModule],
  controllers: [SocraticController],
  providers: [
    SocraticService,
    { provide: SOCRATIC_REPOSITORY, useClass: SocraticRepositoryDrizzle },
  ],
})
export class SocraticModule {}
