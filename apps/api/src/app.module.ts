import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { FeatureGuard } from './common/guards/feature.guard';
import { ContextoGuard } from './common/guards/contexto.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UsuarioAtivoGuard } from './common/guards/usuario-ativo.guard';
import { DbModule } from './db/db.module';
import { AdminModule } from './modules/identidade/admin/admin.module';
import { AiModule } from './modules/plataforma/ai/ai.module';
import { AuthModule } from './modules/identidade/auth/auth.module';
import { DashboardModule } from './modules/aprendizagem/dashboard/dashboard.module';
import { InstituicaoModule } from './modules/academico/instituicao/instituicao.module';
import { GamificacaoModule } from './modules/engajamento/gamificacao/gamificacao.module';
import { HealthModule } from './modules/plataforma/health/health.module';
import { OnboardingModule } from './modules/aprendizagem/onboarding/onboarding.module';
import { ProfilerModule } from './modules/aprendizagem/profiler/profiler.module';
import { QuizModule } from './modules/aprendizagem/quiz/quiz.module';
import { RedacaoModule } from './modules/aprendizagem/redacao/redacao.module';
import { SocraticModule } from './modules/aprendizagem/socratic/socratic.module';
import { StudyTrailsModule } from './modules/aprendizagem/study-trails/study-trails.module';
import { ClassModule } from './modules/academico/class/class.module';
import { BattleModule } from './modules/engajamento/battle/battle.module';
import { SimuladoModule } from './modules/aprendizagem/simulado/simulado.module';
import { EscopoModule } from './modules/identidade/escopo/escopo.module';
import { DesempenhoModule } from './modules/academico/desempenho/desempenho.module';
import { AnoLetivoModule } from './modules/academico/ano-letivo/ano-letivo.module';
import { TurmaModule } from './modules/academico/turma/turma.module';
import { AcademicoModule } from './modules/academico/academico/academico.module';
import { ImportacaoModule } from './modules/academico/importacao/importacao.module';
import { ResponsavelModule } from './modules/identidade/responsavel/responsavel.module';
import { LeadModule } from './modules/plataforma/lead/lead.module';

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
    InstituicaoModule,
    AdminModule,
    AiModule,
    ClassModule,
    BattleModule,
    SimuladoModule,
    EscopoModule,
    DesempenhoModule,
    AnoLetivoModule,
    TurmaModule,
    AcademicoModule,
    ImportacaoModule,
    ResponsavelModule,
    LeadModule,
  ],
  providers: [
    // Filtro global de exceções — loga erros com stack trace e padroniza a
    // resposta JSON para o frontend (doc 03 §4). DEVE ser registrado ANTES
    // dos guards para capturar exceções deles também.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Ordem importa: Nest executa APP_GUARD na ordem registrada.
    // FeatureGuard primeiro — uma rota de funcionalidade oculta responde 404
    // para todo mundo, antes mesmo de olhar o token. AuthGuard depois (anexa
    // request.user), UsuarioAtivoGuard barra conta suspensa ou pendente, RolesGuard
    // decide o papel e ContextoGuard confere o contexto escolhido por último.
    { provide: APP_GUARD, useClass: FeatureGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: UsuarioAtivoGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ContextoGuard },
  ],
})
export class AppModule {}
