import { Inject, Injectable } from '@nestjs/common';
import type {
  AreaConhecimento,
  DashboardRepositoryPort,
  DashboardResponse,
  Eixo4D,
} from '@notaa/contracts';
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import { nivelDeXp } from '../gamificacao/nivel';
import { DASHBOARD_REPOSITORY } from './dashboard.tokens';

/**
 * Mapa θ→nota PROVISÓRIO (Q-06, doc 04 §4/doc 08 §8) — linear simples,
 * NUNCA o mapeamento oficial ENEM. Resposta sempre marca `naoCalibrado: true`
 * para o cliente não tratar como nota real. Substituir quando especialista
 * validar a equivalência (psicometria/TRI oficial do ENEM).
 */
function notaPlaceholder(theta: number): number {
  return Math.min(1000, Math.max(0, Math.round(500 + theta * 100)));
}

// Monta o objeto Nivel do dashboard a partir da curva única (gamificacao/nivel.ts).
import { calcularProgressaoNivel } from '../gamificacao/nivel';

// Rótulos canônicos dos 4 eixos (doc 04 §3) — fonte da verdade do domínio.
// Na Fase 1 só Reflexivo↔Impulsivo recebe sinal real (tempo+acerto do quiz);
// os outros 3 ficam neutros e marcados `temSinal:false` (não fabricar posição).
const EIXOS_4D = [
  { chave: 'visual_verbal', poloA: 'Visual', poloB: 'Verbal' },
  { chave: 'analitico_holistico', poloA: 'Analítico', poloB: 'Holístico' },
  { chave: 'sequencial_aleatorio', poloA: 'Sequencial', poloB: 'Aleatório' },
  { chave: 'reflexivo_impulsivo', poloA: 'Reflexivo', poloB: 'Impulsivo' },
] as const;

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort,
    private readonly gamificacao: GamificacaoService,
  ) {}

  async getDashboard(estudanteId: string): Promise<DashboardResponse> {
    const [resumo, xpTotal, streak, perfil] = await Promise.all([
      this.repo.getThetaResumo(estudanteId),
      this.gamificacao.getXpTotal(estudanteId),
      this.gamificacao.getStreak(estudanteId),
      this.repo.getResumoPerfil(estudanteId),
    ]);

    const areas = Object.keys(resumo) as AreaConhecimento[];
    const porArea: Record<string, number> = {};
    for (const area of areas) porArea[area] = notaPlaceholder(resumo[area]!.atual);

    const geral =
      areas.length > 0
        ? Math.round(areas.reduce((acc, area) => acc + porArea[area]!, 0) / areas.length)
        : notaPlaceholder(0);

    const p4d = perfil.perfil4d;
    const valores: Record<string, number> = {
      visual_verbal: p4d?.visualVerbal ?? 0,
      analitico_holistico: p4d?.analiticoHolistico ?? 0,
      sequencial_aleatorio: p4d?.sequencialAleatorio ?? 0,
      reflexivo_impulsivo: p4d?.reflexivoImpulsivo ?? 0,
    };
    const temSinalReflexivo = (p4d?.confianca ?? 0) > 0;
    const eixos: Eixo4D[] = EIXOS_4D.map((e) => ({
      chave: e.chave,
      poloA: e.poloA,
      poloB: e.poloB,
      valor: valores[e.chave]!,
      // Só o eixo Reflexivo↔Impulsivo é alimentado por sinal real na Fase 1.
      temSinal: e.chave === 'reflexivo_impulsivo' ? temSinalReflexivo : false,
    }));

    return {
      perfil: {
        nome: perfil.nome,
        objetivoEnem: perfil.objetivoEnem,
        onboardingConcluido: perfil.onboardingConcluido,
      },
      estimativaNota: { geral, porArea, naoCalibrado: true },
      nivel: calcularProgressaoNivel(xpTotal),
      xpTotal,
      streak: {
        diasConsecutivos: streak.diasConsecutivos,
        freezesDisponiveis: streak.freezesDisponiveis,
        ultimaAtividade: streak.ultimaAtividade,
      },
      perfilCognitivo4d: { confianca: p4d?.confianca ?? 0, eixos },
      theta: resumo as DashboardResponse['theta'],
      progresso: {
        redacoesEnviadas: perfil.redacoesEnviadas,
        sessoesSocraticas: perfil.sessoesSocraticas,
      },
    };
  }
}
