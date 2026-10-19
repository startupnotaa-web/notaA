import { createHmac } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { CriarLeadRequest, CriarLeadResponse, LeadParaGravar, LeadRepositoryPort } from '@notaa/contracts';
import { LEAD_REPOSITORY } from './lead.tokens';

/** Envios por origem de rede, por hora. Ajustável por LEAD_LIMITE_POR_HORA. */
const LIMITE_PADRAO_POR_HORA = 5;

function paraGravar(dados: CriarLeadRequest): LeadParaGravar {
  return {
    origem: dados.origem,
    nome: dados.nome,
    email: dados.email,
    organizacao:
      dados.origem === 'demo' ? dados.instituicao : dados.origem === 'espera' ? dados.faculdadeCurso : null,
    perfil: dados.origem === 'contato' ? dados.perfil : null,
    versaoPolitica: dados.versaoPolitica,
  };
}

/**
 * Leads da landing pública (contato, demonstração, lista de espera).
 *
 * Regras que valem aqui:
 * - A resposta é a mesma (202) para lead novo, e-mail repetido e isca preenchida. Quem chama não descobre
 *   se um e-mail já está na base, nem que o robô foi pego.
 * - Nenhum dado pessoal em log: o log leva só a origem do formulário. Os erros do repositório já chegam sem os
 *   valores da requisição.
 * - O limite de envios usa um HMAC do IP. O IP em si não é gravado nem logado.
 * - Sem LEAD_HASH_SALT o limite fica desligado (fail-open, como o limite de IA) e a API avisa no log.
 */
@Injectable()
export class LeadService {
  private readonly logger = new Logger('Lead');
  private avisouSemSegredo = false;

  constructor(@Inject(LEAD_REPOSITORY) private readonly repo: LeadRepositoryPort) {}

  async registrar(dados: CriarLeadRequest, enderecoDeRede: string | null): Promise<CriarLeadResponse> {
    // Isca preenchida: descarta sem gravar, sem contar e sem erro.
    if (dados.website) {
      this.logger.warn(`Lead descartado pela isca (origem=${dados.origem}).`);
      return { ok: true };
    }

    await this.aplicarLimite(enderecoDeRede);

    try {
      const resultado = await this.repo.registrar(paraGravar(dados));
      this.logger.log(`Lead ${resultado} (origem=${dados.origem}).`);
    } catch (erro) {
      // A mensagem do repositório já vem sem dados pessoais (código do Postgres apenas).
      this.logger.error(erro instanceof Error ? erro.message : 'Falha ao gravar o lead.');
      throw new ServiceUnavailableException({
        error: { code: 'LEAD_INDISPONIVEL', message: 'Não foi possível enviar agora. Tente de novo em alguns minutos.' },
      });
    }
    return { ok: true };
  }

  private async aplicarLimite(enderecoDeRede: string | null): Promise<void> {
    const segredo = process.env.LEAD_HASH_SALT;
    if (!segredo) {
      if (!this.avisouSemSegredo) {
        this.avisouSemSegredo = true;
        this.logger.warn('LEAD_HASH_SALT ausente: o limite de envios por origem de rede está desligado.');
      }
      return;
    }
    if (!enderecoDeRede) return; // sem endereço não há chave; todo mundo cairia no mesmo balde

    const limite = Number(process.env.LEAD_LIMITE_POR_HORA ?? LIMITE_PADRAO_POR_HORA);
    const chave = createHmac('sha256', segredo).update(enderecoDeRede).digest('hex');
    let contagem: number;
    try {
      contagem = await this.repo.consumirJanela(chave);
    } catch (erro) {
      // Fail-open: o contador não pode derrubar o formulário.
      this.logger.error(erro instanceof Error ? erro.message : 'Falha no contador de envios.');
      return;
    }
    if (contagem > limite) {
      throw new HttpException(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e envie de novo.',
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
