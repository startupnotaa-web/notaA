import { Controller, Get, Req, Inject } from '@nestjs/common';
import type { MeResponse, Eixo4D } from '@notaa/contracts';
import type { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, usuario, perfilCognitivo4d } from '@notaa/db';
import { eq } from 'drizzle-orm';
import { calcularProgressaoNivel } from '../gamificacao/nivel';

// doc 05 §2 — GET /me, papéis: todos (sem @Roles() => qualquer papel autenticado).
@Controller('me')
export class MeController {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  @Get()
  async getMe(@Req() request: AuthenticatedRequest): Promise<MeResponse> {
    const { sub, email, app_metadata } = request.user;
    
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
      plano: null,
      gamificacao,
      perfilCognitivo,
    };
  }
}
