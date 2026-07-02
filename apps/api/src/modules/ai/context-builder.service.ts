import { Injectable, Inject } from '@nestjs/common';
import type { PerfilCognitivoState } from '@notaa/contracts';
import { ProfilerService } from '../profiler/profiler.service';
import { DB_CLIENT } from '../../db/db.tokens';
import { Database, perfilOnboarding, eq } from '@notaa/db';

const DICIONARIO_PEDAGOGICO: Record<string, string> = {
  Visual: 'Priorize descrições de tabelas, gráficos, fluxogramas e mapas mentais.',
  Prático: 'Crie situações-problema aplicadas ao cotidiano e à vida real.',
  Auditivo: 'Utilize linguagem fluida, explicativa e em tom de narração como uma aula falada.',
};

@Injectable()
export class ContextBuilderService {
  constructor(
    private readonly profiler: ProfilerService,
    @Inject(DB_CLIENT) private readonly db: Database,
  ) {}

  private async getDicasEstilo(estudanteId: string): Promise<string[]> {
    const [onb] = await this.db
      .select({ estilo: perfilOnboarding.estiloAprendizagemAutodeclarado })
      .from(perfilOnboarding)
      .where(eq(perfilOnboarding.estudanteId, estudanteId))
      .limit(1);

    const dicas: string[] = [];
    if (onb?.estilo && typeof onb.estilo === 'object' && 'comoAprendeMelhor' in onb.estilo) {
      const estilos = (onb.estilo as any).comoAprendeMelhor as string[];
      if (Array.isArray(estilos)) {
        for (const e of estilos) {
          if (DICIONARIO_PEDAGOGICO[e]) dicas.push(DICIONARIO_PEDAGOGICO[e]);
        }
      }
    }
    return dicas;
  }

  async montarContextoSocratico(
    estudanteId: string,
    extras: { temaAtivo?: string; historico?: string[] },
  ): Promise<object> {
    const perfilResponse = await this.profiler.getPerfil(estudanteId);
    const dicasEstilo = await this.getDicasEstilo(estudanteId);

    return {
      perfilCognitivo: {
        eixoVisualVerbal: perfilResponse.eixoVisualVerbal,
        eixoAnaliticoHolistico: perfilResponse.eixoAnaliticoHolistico,
        eixoSequencialAleatorio: perfilResponse.eixoSequencialAleatorio,
        eixoReflexivoImpulsivo: perfilResponse.eixoReflexivoImpulsivo,
        confianca: perfilResponse.confianca,
      },
      instrucoesPedagogicas: dicasEstilo,
      recomendacoesAtivas: perfilResponse.recomendacoesAtivas,
      temaAtivo: extras.temaAtivo ?? null,
      historicoRecente: extras.historico ?? [],
    };
  }

  async montarContextoRedacao(estudanteId: string): Promise<object> {
    const perfilResponse = await this.profiler.getPerfil(estudanteId);
    const dicasEstilo = await this.getDicasEstilo(estudanteId);

    return {
      perfilCognitivo: {
        eixoVisualVerbal: perfilResponse.eixoVisualVerbal,
        eixoAnaliticoHolistico: perfilResponse.eixoAnaliticoHolistico,
        eixoSequencialAleatorio: perfilResponse.eixoSequencialAleatorio,
        eixoReflexivoImpulsivo: perfilResponse.eixoReflexivoImpulsivo,
        confianca: perfilResponse.confianca,
      },
      instrucoesPedagogicas: dicasEstilo,
      recomendacoesAtivas: perfilResponse.recomendacoesAtivas,
    };
  }
}
