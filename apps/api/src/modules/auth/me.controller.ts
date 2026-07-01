import { Body, Controller, Get, InternalServerErrorException, Logger, Patch, Req, Inject } from '@nestjs/common';
import { UpdateMeRequestSchema, type MeResponse, type Eixo4D, type UpdateMeRequest } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, usuario, perfilCognitivo4d, assinatura, plano, desc, eq } from '@notaa/db';
import { calcularProgressaoNivel } from '../gamificacao/nivel';

// doc 05 §2 — GET /me, papéis: todos (sem @Roles() => qualquer papel autenticado).
@Controller('me')
export class MeController {
  private readonly logger = new Logger(MeController.name);

  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  @Get()
  async getMe(@Req() request: AuthenticatedRequest): Promise<MeResponse> {
    const { sub, email, app_metadata } = request.user;

    try {
      const [userRecord] = await this.db
        .select({
          nome: usuario.nome,
          p4d: {
            visualVerbal: perfilCognitivo4d.eixoVisualVerbal,
            analiticoHolistico: perfilCognitivo4d.eixoAnaliticoHolistico,
            sequencialAleatorio: perfilCognitivo4d.eixoSequencialAleatorio,
            reflexivoImpulsivo: perfilCognitivo4d.eixoReflexivoImpulsivo,
            confianca: perfilCognitivo4d.confianca,
            xpTotal: perfilCognitivo4d.xpTotal,
            ofensivaDias: perfilCognitivo4d.ofensivaDias,
          }
        })
        .from(usuario)
        .leftJoin(perfilCognitivo4d, eq(perfilCognitivo4d.estudanteId, usuario.id))
        .where(eq(usuario.id, sub))
        .limit(1);

      const nome = userRecord?.nome ?? null;
      const p4d = userRecord?.p4d;

      // Assinatura vigente do usuário (doc 04 §8). Sem linha em `assinatura` =>
      // plano null (a UI mostra "Plano Gratuito"). Pega a mais recente por vigência.
      const [assinaturaRecord] = await this.db
        .select({ tipo: plano.tipo, status: assinatura.status })
        .from(assinatura)
        .innerJoin(plano, eq(plano.id, assinatura.planoId))
        .where(eq(assinatura.usuarioId, sub))
        .orderBy(desc(assinatura.vigenciaInicio))
        .limit(1);

      const planoResp = assinaturaRecord
        ? { tipo: assinaturaRecord.tipo, status: assinaturaRecord.status }
        : null;

      let gamificacao = null;
      let perfilCognitivo = null;
      
      if (p4d && p4d.xpTotal != null) {
        const valores = {
          visual_verbal: Number(p4d.visualVerbal),
          analitico_holistico: Number(p4d.analiticoHolistico),
          sequencial_aleatorio: Number(p4d.sequencialAleatorio),
          reflexivo_impulsivo: Number(p4d.reflexivoImpulsivo),
        };
        const confianca = Number(p4d.confianca);
        const temSinalReflexivo = confianca > 0;
        
        const eixos: Eixo4D[] = [
          { chave: 'visual_verbal', poloA: 'Visual', poloB: 'Verbal', valor: valores.visual_verbal, temSinal: false },
          { chave: 'analitico_holistico', poloA: 'Analítico', poloB: 'Holístico', valor: valores.analitico_holistico, temSinal: false },
          { chave: 'sequencial_aleatorio', poloA: 'Sequencial', poloB: 'Aleatório', valor: valores.sequencial_aleatorio, temSinal: false },
          { chave: 'reflexivo_impulsivo', poloA: 'Reflexivo', poloB: 'Impulsivo', valor: valores.reflexivo_impulsivo, temSinal: temSinalReflexivo },
        ];
        
        gamificacao = {
          nivel: calcularProgressaoNivel(p4d.xpTotal),
          xpTotal: p4d.xpTotal,
          ofensivaDias: p4d.ofensivaDias,
        };
        
        perfilCognitivo = {
          confianca,
          eixos,
        };
      }

      return {
        id: sub,
        nome,
        email: email ?? '',
        tipoPerfil: app_metadata.papel,
        escolaId: app_metadata.escola_id ?? null,
        plano: planoResp,
        gamificacao,
        perfilCognitivo,
      };
    } catch (error) {
      this.logger.error(
        `Falha ao buscar perfil para usuário ${sub}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        error: { code: 'ME_LOAD_FAILED', message: 'Não foi possível carregar o perfil do usuário.' },
      });
    }
  }

  // doc 05 §2 — PATCH /me: edita dados pessoais do próprio usuário (hoje, só o
  // nome). `email` é credencial do Supabase Auth e não é alterável por aqui.
  // Reusa getMe() para devolver o perfil completo e fresco após salvar.
  @Patch()
  async updateMe(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateMeRequestSchema)) body: UpdateMeRequest,
  ): Promise<MeResponse> {
    const { sub } = request.user;

    try {
      await this.db
        .update(usuario)
        .set({ nome: body.nome, atualizadoEm: new Date() })
        .where(eq(usuario.id, sub));

      return await this.getMe(request);
    } catch (error) {
      // Se getMe já lançou InternalServerErrorException, propaga sem re-wrap.
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(
        `Falha ao atualizar perfil para usuário ${sub}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException({
        error: { code: 'ME_UPDATE_FAILED', message: 'Não foi possível atualizar o perfil.' },
      });
    }
  }
}
