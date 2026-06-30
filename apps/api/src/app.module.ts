import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DbModule } from './db/db.module';
import { AdminModule } from './modules/admin/admin.module';
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
    GamificacaoModule,
    EscolaModule,
    AdminModule,
  ],
  providers: [
    // Ordem importa: AuthGuard roda primeiro (anexa request.user), RolesGuard
    // depois (decide com base nele). Nest executa APP_GUARD na ordem registrada.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
