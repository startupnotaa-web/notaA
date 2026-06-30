import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SocraticResponse } from '@notaa/contracts';
import {
  construirCareProtocol,
  contemRespostaDireta,
  detectarSinalDeRisco,
  type ResultadoTriagem,
} from './guardrails';
import { RISK_REPOSITORY } from './ai.tokens';
import type { RiskRepositoryPort } from './risk.repository';

type CareProtocol = Extract<SocraticResponse, { tipo: 'care_protocol' }>;
type Severidade = 'baixa' | 'media' | 'alta';

/**
 * Detector de risco + guardrails de conteúdo (I3/I6, doc 06 §2.3/§4). A DECISÃO
 * é determinística e desta camada — nunca delegada ao provedor de IA. Acionar o
 * protocolo grava `ocorrencia_risco` (append-only, auditável) e registra a
 * escalação. A notificação real ao responsável/escola é um passo futuro (marcado
 * em `acaoTomada.notificacao`), mas a ocorrência e a escalação já são gravadas.
 */
@Injectable()
export class RiskDetectorService {
  private readonly logger = new Logger('RiskDetector');

  constructor(@Inject(RISK_REPOSITORY) private readonly repo: RiskRepositoryPort) {}

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
      notificacao: 'pendente', // TODO: integrar notificador real (responsável/escola)
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
    return { ocorrenciaId };
  }
}
