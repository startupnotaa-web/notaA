import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../db/db.tokens';
import type { Database } from '@notaa/db';
import { dadoSensivelEstudante, perfilOnboarding, perfilCognitivo4d, usuario, eq } from '@notaa/db';
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
        .then((res) => res[0]),
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
        ...(user?.nome ? { passo1: { nome: user.nome, idade: row.idade ?? undefined, serie: row.serie ?? undefined } } : {}),
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

    // `dados` chega validado pelo schema do passo (OnboardingService); aqui
    // só se lê o campo que cada passo grava.
    const d = dados as Partial<
      Pick<
        typeof perfilOnboarding.$inferInsert,
        | 'idade'
        | 'serie'
        | 'objetivoEnem'
        | 'estiloAprendizagemAutodeclarado'
        | 'dificuldades'
        | 'rotinaEstudo'
        | 'autopercepcao'
      >
    > & { nome?: unknown; neurodivergencia?: unknown; consentimentoBaseLegal?: string | null };

    // O passo 1 ("nome") mora em `usuario`, não em `perfil_onboarding`.
    if (passo === 1 && typeof d.nome === 'string') {
      await this.db
        .update(usuario)
        .set({ nome: d.nome, atualizadoEm: new Date() })
        .where(eq(usuario.id, estudanteId));
    }

    const updates: Partial<typeof perfilOnboarding.$inferInsert> = {
      passoAtual: Math.max(passo, 1),
      atualizadoEm: new Date(),
    };

    // Cada passo grava SÓ o seu campo interno (não o envelope inteiro `dados`,
    // que duplicaria a chave — ex.: passo 3 grava o objeto de estilo, não
    // { estiloAprendizagemAutodeclarado: {...} }).
    if (passo === 1) {
      if (d.idade !== undefined) updates.idade = d.idade;
      if (d.serie !== undefined) updates.serie = d.serie;
    }
    if (passo === 2) updates.objetivoEnem = d.objetivoEnem ?? null;
    if (passo === 3) updates.estiloAprendizagemAutodeclarado = d.estiloAprendizagemAutodeclarado;
    if (passo === 4) updates.dificuldades = d.dificuldades;
    if (passo === 5) updates.rotinaEstudo = d.rotinaEstudo;
    if (passo === 6) updates.autopercepcao = d.autopercepcao;

    // Passo 7 — dado SENSÍVEL: vai para a tabela isolada dado_sensivel_estudante
    // (doc 10 §3, minimização), NUNCA para perfil_onboarding. O OnboardingService
    // já barrou <18 sem consentimento de responsável (auditoria R3) — aqui, quem
    // consente é o próprio titular (≥18). Antes, este passo era validado e
    // silenciosamente DESCARTADO (nenhum `if (passo === 7)` existia).
    if (passo === 7) {
      const neurodivergencia = d.neurodivergencia as Record<string, boolean> | undefined;
      const marcouAlgo = neurodivergencia && Object.values(neurodivergencia).some(Boolean);
      if (marcouAlgo) {
        const registroSensivel = {
          neurodivergencia,
          consentimentoBaseLegal: d.consentimentoBaseLegal ?? null,
          consentidoPor: estudanteId,
          consentidoEm: new Date(),
          atualizadoEm: new Date(),
        };
        await this.db
          .insert(dadoSensivelEstudante)
          .values({ estudanteId, ...registroSensivel })
          .onConflictDoUpdate({
            target: dadoSensivelEstudante.estudanteId,
            set: registroSensivel,
          });
      }
    }

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
    await this.db.transaction(async (tx) => {
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
