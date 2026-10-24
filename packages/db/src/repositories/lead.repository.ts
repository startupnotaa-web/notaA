import { lt, sql } from 'drizzle-orm';
import type { LeadParaGravar, LeadRepositoryPort } from '@notaa/contracts';
import type { Database } from '../client';
import { leadLanding, leadRateLimit } from '../schema';

/** Código de erro do Postgres, se houver. A mensagem do driver traz o SQL com os valores, que aqui são dados pessoais. */
function codigoDoErro(e: unknown): string {
  const c = (e as { code?: unknown; cause?: { code?: unknown } } | null) ?? {};
  const codigo = c.code ?? c.cause?.code;
  return typeof codigo === 'string' ? codigo : 'desconhecido';
}

/**
 * Adaptador Drizzle de LeadRepositoryPort (lead_landing e lead_rate_limit).
 *
 * Nenhum erro sai daqui com a mensagem original: o driver monta a mensagem com o
 * comando e os parâmetros, e os parâmetros são nome e e-mail de quem preencheu o
 * formulário. O chamador recebe um erro genérico com o código do Postgres.
 */
export class LeadRepositoryDb implements LeadRepositoryPort {
  constructor(private readonly db: Database) {}

  async consumirJanela(chaveHash: string): Promise<number> {
    try {
      const [linha] = await this.db
        .insert(leadRateLimit)
        .values({ chaveHash, janelaInicio: sql`date_trunc('hour', now())`, contagem: 1 })
        .onConflictDoUpdate({
          target: [leadRateLimit.chaveHash, leadRateLimit.janelaInicio],
          set: { contagem: sql`${leadRateLimit.contagem} + 1` },
        })
        .returning({ contagem: leadRateLimit.contagem });
      // Limpeza ocasional: janelas de mais de 2 h já não limitam ninguém.
      if (Math.random() < 0.05) {
        await this.db.delete(leadRateLimit).where(lt(leadRateLimit.janelaInicio, sql`now() - interval '2 hours'`));
      }
      return linha?.contagem ?? 1;
    } catch (e) {
      throw new Error(`Falha no contador de envios (código ${codigoDoErro(e)}).`);
    }
  }

  async registrar(lead: LeadParaGravar): Promise<'criado' | 'repetido'> {
    try {
      const criadas = await this.db
        .insert(leadLanding)
        .values({
          origem: lead.origem,
          nome: lead.nome,
          email: lead.email,
          organizacao: lead.organizacao,
          perfil: lead.perfil,
          versaoPolitica: lead.versaoPolitica,
        })
        .onConflictDoNothing({ target: [leadLanding.origem, leadLanding.email] })
        .returning({ id: leadLanding.id });
      return criadas.length > 0 ? 'criado' : 'repetido';
    } catch (e) {
      throw new Error(`Falha ao gravar o lead (código ${codigoDoErro(e)}).`);
    }
  }
}
