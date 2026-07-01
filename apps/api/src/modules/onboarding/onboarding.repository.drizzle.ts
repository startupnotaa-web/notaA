import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import type { Database } from '@notaa/db';
import { perfilOnboarding, perfilCognitivo4d, usuario, eq } from '@notaa/db';
import type { OnboardingRepositoryPort, OnboardingState } from '@notaa/contracts';
import {
  MOCK_DEV_USER_ID,
  MOCK_DEV_USER_EMAIL,
  MOCK_DEV_USER_NOME,
  isDevBypassEnabled,
} from '../../common/dev-user';

/**
 * Adaptador Drizzle real de OnboardingRepositoryPort (perfil_onboarding, doc 04 §3).
 *
 * Cada passo é mapeado para a COLUNA tipada correspondente (não um blob `dados`):
 * o `getState` reconstrói um mapa `passoN` cuja forma espelha exatamente o schema
 * Zod de cada passo (OnboardingStepSchemas) — assim um valor lido pode ser
 * reenviado sem transformação (round-trip do salvamento incremental, A6).
 * O `nome` (passo 1) pertence a `usuario`, não a `perfil_onboarding`.
 */
@Injectable()
export class OnboardingRepositoryDrizzle implements OnboardingRepositoryPort {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getState(estudanteId: string): Promise<OnboardingState> {
    const [row, user] = await Promise.all([
      this.db
        .select()
        .from(perfilOnboarding)
        .where(eq(perfilOnboarding.estudanteId, estudanteId))
        .limit(1)
        .then((res: any[]) => res[0]),
      this.db
        .select({ nome: usuario.nome })
        .from(usuario)
        .where(eq(usuario.id, estudanteId))
        .limit(1)
        .then((res: { nome: string | null }[]) => res[0]),
    ]);

    if (!row) {
      return {
        passoAtual: 1,
        dados: user?.nome ? { passo1: { nome: user.nome } } : {},
        concluido: false,
      };
    }

    return {
      passoAtual: row.passoAtual,
      dados: {
        ...(user?.nome ? { passo1: { nome: user.nome } } : {}),
        ...(row.objetivoEnem ? { passo2: { objetivoEnem: row.objetivoEnem } } : {}),
        ...(row.estiloAprendizagemAutodeclarado
          ? { passo3: { estiloAprendizagemAutodeclarado: row.estiloAprendizagemAutodeclarado } }
          : {}),
        ...(row.dificuldades ? { passo4: { dificuldades: row.dificuldades } } : {}),
        ...(row.rotinaEstudo ? { passo5: { rotinaEstudo: row.rotinaEstudo } } : {}),
        ...(row.autopercepcao ? { passo6: { autopercepcao: row.autopercepcao } } : {}),
      },
      concluido: row.concluidoEm !== null,
    };
  }

  async saveStep(
    estudanteId: string,
    passo: number,
    dados: Record<string, unknown>,
  ): Promise<{ passoAtual: number; proximoPasso: number | null }> {
    // Em dev (bypass x-development-mode) o trigger do Supabase Auth não existe,
    // então o `usuario` mock precisa ser garantido aqui — senão a FK de
    // perfil_onboarding.estudante_id → usuario.id falha. Mesma condição do
    // AuthGuard (isDevBypassEnabled), restrita ao id mock.
    if (isDevBypassEnabled() && estudanteId === MOCK_DEV_USER_ID) {
      await this.db
        .insert(usuario)
        .values({
          id: MOCK_DEV_USER_ID,
          authUid: MOCK_DEV_USER_ID,
          nome: MOCK_DEV_USER_NOME,
          email: MOCK_DEV_USER_EMAIL,
          tipoPerfil: 'estudante',
          status: 'ativo',
        })
        .onConflictDoNothing();
    }

    // O passo 1 ("nome") mora em `usuario`, não em `perfil_onboarding`.
    if (passo === 1 && typeof (dados as any).nome === 'string') {
      await this.db
        .update(usuario)
        .set({ nome: (dados as any).nome, atualizadoEm: new Date() })
        .where(eq(usuario.id, estudanteId));
    }

    const updates: Partial<typeof perfilOnboarding.$inferInsert> = {
      passoAtual: Math.max(passo, 1),
      atualizadoEm: new Date(),
    };

    // Cada passo grava SÓ o seu campo interno (não o envelope inteiro `dados`,
    // que duplicaria a chave — ex.: passo 3 grava o objeto de estilo, não
    // { estiloAprendizagemAutodeclarado: {...} }).
    if (passo === 2) updates.objetivoEnem = (dados as any).objetivoEnem ?? null;
    if (passo === 3) updates.estiloAprendizagemAutodeclarado = (dados as any).estiloAprendizagemAutodeclarado;
    if (passo === 4) updates.dificuldades = (dados as any).dificuldades;
    if (passo === 5) updates.rotinaEstudo = (dados as any).rotinaEstudo;
    if (passo === 6) updates.autopercepcao = (dados as any).autopercepcao;

    await this.db
      .insert(perfilOnboarding)
      .values({
        estudanteId,
        ...updates,
      })
      .onConflictDoUpdate({
        target: perfilOnboarding.estudanteId,
        set: updates,
      });

    return { passoAtual: passo, proximoPasso: passo < 8 ? passo + 1 : null };
  }

  async complete(estudanteId: string): Promise<void> {
    await this.db.transaction(async (tx: any) => {
      await tx
        .update(perfilOnboarding)
        .set({ concluidoEm: new Date(), atualizadoEm: new Date() })
        .where(eq(perfilOnboarding.estudanteId, estudanteId));

      // Instancia o PerfilCognitivo4D inicial com valores NEUTROS (todos os
      // eixos em 0, confiança 0) — doc 05 §3. Idempotente: não sobrescreve um
      // perfil já existente (o aluno pode ter respondido quiz antes de concluir).
      await tx
        .insert(perfilCognitivo4d)
        .values({
          estudanteId,
          eixoVisualVerbal: '0',
          eixoAnaliticoHolistico: '0',
          eixoSequencialAleatorio: '0',
          eixoReflexivoImpulsivo: '0',
          confianca: '0',
        })
        .onConflictDoNothing();
    });
  }
}
