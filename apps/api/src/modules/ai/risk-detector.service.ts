import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { SocraticResponse } from '@notaa/contracts';
import {
  construirCareProtocol,
  contemRespostaDireta,
  detectarSinalDeRisco,
  type ResultadoTriagem,
} from './guardrails';
import { RISK_REPOSITORY } from './ai.tokens';
import type { RiskRepositoryPort } from './risk.repository';
import { CareNotifierService } from './care-notifier.service';

type CareProtocol = Extract<SocraticResponse, { tipo: 'care_protocol' }>;
type Severidade = 'baixa' | 'media' | 'alta';

/**
 * Detector de risco + guardrails de conteúdo (I3/I6, doc 06 §2.3/§4). A DECISÃO
 * é determinística e desta camada — nunca delegada ao provedor de IA. Acionar o
 * protocolo grava `ocorrencia_risco` (append-only, auditável), registra a
 * escalação e — quando escala a responsável/escola — dispara o notificador
 * (CareNotifierService, decisão Q-01 do doc 10 §6).
 */
@Injectable()
export class RiskDetectorService {
  private readonly logger = new Logger('RiskDetector');

  constructor(
    @Inject(RISK_REPOSITORY) private readonly repo: RiskRepositoryPort,
    @Optional() private readonly notifier?: CareNotifierService,
  ) {}

  /** I6 — triagem determinística do texto do estudante. */
  triagem(texto: string): ResultadoTriagem {
    return detectarSinalDeRisco(texto);
  }

  /** I3 — true se a resposta contém a solução final (não pode ir ao aluno). */
  contemRespostaDireta(texto: string): boolean {
    return contemRespostaDireta(texto);
  }

  /**
   * Aciona o protocolo de cuidado humano: grava a ocorrência, registra a
   * escalação e devolve a resposta `care_protocol` (com recursos de apoio).
   */
  async acionarCuidado(input: {
    estudanteId: string;
    origem: 'socratica' | 'redacao';
    referenciaId: string;
    sinais: string[];
    severidade: Severidade;
  }): Promise<CareProtocol> {
    const resposta = construirCareProtocol(input.severidade);
    await this.registrarOcorrencia({
      estudanteId: input.estudanteId,
      origem: input.origem,
      referenciaId: input.referenciaId,
      sinal: input.sinais.join('; ') || 'sinal_de_risco',
      severidade: input.severidade,
      escalonamento: resposta.escalonamento,
      fonte: 'triagem_deterministica',
    });
    return resposta;
  }

  /**
   * Grava a ocorrência e loga a escalação (notificação real = futuro). Usado
   * tanto pela triagem determinística quanto quando o próprio LLM devolve
   * `care_protocol` (defesa em profundidade — nunca só devolver a mensagem).
   */
  async registrarOcorrencia(input: {
    estudanteId: string;
    origem: 'socratica' | 'redacao';
    referenciaId: string;
    sinal: string;
    severidade: Severidade;
    escalonamento: CareProtocol['escalonamento'];
    fonte: string;
  }): Promise<{ ocorrenciaId: string }> {
    const acaoTomada = {
      escalonamento: input.escalonamento,
      fonte: input.fonte,
      recursosOferecidos: ['CVV 188'],
      notificacao: input.escalonamento === 'responsavel_escola' ? 'in_app' : 'nao_aplicavel',
    };
    const { ocorrenciaId } = await this.repo.registrarOcorrencia({
      estudanteId: input.estudanteId,
      origem: input.origem,
      referenciaId: input.referenciaId,
      sinal: input.sinal,
      severidade: input.severidade,
      acaoTomada,
    });
    this.logger.warn(
      `PROTOCOLO DE CUIDADO acionado [${input.origem}] ocorrencia=${ocorrenciaId} severidade=${input.severidade} escalonamento=${input.escalonamento} fonte=${input.fonte}`,
    );

    // Notificação best-effort (Q-01): falha ao notificar não pode derrubar a
    // resposta acolhedora ao aluno — a ocorrência já está gravada e auditável.
    if (this.notifier) {
      try {
        await this.notifier.notificar({
          ocorrenciaId,
          estudanteId: input.estudanteId,
          escalonamento: input.escalonamento,
        });
      } catch (err) {
        this.logger.error(
          `falha ao notificar protocolo de cuidado (ocorrencia=${ocorrenciaId}): ` +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }
    return { ocorrenciaId };
  }
}
