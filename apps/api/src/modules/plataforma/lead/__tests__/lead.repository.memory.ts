import type { LeadParaGravar, LeadRepositoryPort } from '@notaa/contracts';

/** Double em memória para os testes: nenhum teste da API toca em banco. */
export class LeadRepositoryMemory implements LeadRepositoryPort {
  readonly leads: LeadParaGravar[] = [];
  private readonly janelas = new Map<string, number>();
  falharAoRegistrar = false;
  falharNoContador = false;

  async consumirJanela(chaveHash: string): Promise<number> {
    if (this.falharNoContador) throw new Error('Falha no contador de envios (código 08006).');
    const total = (this.janelas.get(chaveHash) ?? 0) + 1;
    this.janelas.set(chaveHash, total);
    return total;
  }

  async registrar(lead: LeadParaGravar): Promise<'criado' | 'repetido'> {
    if (this.falharAoRegistrar) throw new Error('Falha ao gravar o lead (código 08006).');
    if (this.leads.some((l) => l.origem === lead.origem && l.email === lead.email)) return 'repetido';
    this.leads.push(lead);
    return 'criado';
  }
}
