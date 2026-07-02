import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DbModule } from './db/db.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EscolaModule } from './modules/escola/escola.module';
import { GamificacaoModule } from './modules/gamificacao/gamificacao.module';
import { HealthModule } from './modules/health/health.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ProfilerModule } from './modules/profiler/profiler.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { RedacaoModule } from './modules/redacao/redacao.module';
import { SocraticModule } from './modules/socratic/socratic.module';
import { StudyTrailsModule } from './modules/study-trails/study-trails.module';
import { ClassModule } from './modules/class/class.module';
import { BattleModule } from './modules/battle/battle.module';

@Module({
  imports: [
    DbModule,
    HealthModule,
    AuthModule,
    OnboardingModule,
    QuizModule,
    ProfilerModule,
    DashboardModule,
    RedacaoModule,
    SocraticModule,
    StudyTrailsModule,
    GamificacaoModule,
    EscolaModule,
    AdminModule,
    AiModule,
    ClassModule,
    BattleModule,
  ],
  providers: [
    // Filtro global de exceções — loga erros com stack trace e padroniza a
    // resposta JSON para o frontend (doc 03 §4). DEVE ser registrado ANTES
    // dos guards para capturar exceções deles também.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Ordem importa: AuthGuard roda primeiro (anexa request.user), RolesGuard
    // depois (decide com base nele). Nest executa APP_GUARD na ordem registrada.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
