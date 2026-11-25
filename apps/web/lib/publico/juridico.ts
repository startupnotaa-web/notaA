/**
 * Dados que só a empresa pode informar. Enquanto algum campo estiver vazio, /privacidade e /termos saem
 * com noindex e sem o texto, e os formulários de lead ficam desativados. Preencher aqui publica; não
 * escrever marcações no valor (o texto entra no site como está).
 */
export const DADOS_JURIDICOS: Record<string, string> = {
  razaoSocial: '',
  cnpj: '',
  endereco: '',
  canalDeContato: '',
  encarregadoNome: '',
  encarregadoEmail: '',
  prazoRetencaoLeads: '',
  operadores: '',
  canalDosTitulares: '',
  prazoRespostaTitulares: '',
  regraMenores: '',
  versaoTermos: '',
  textoDasClausulas: '',
};

/** Campos ainda vazios. Lista vazia = dá para publicar. */
export function camposJuridicosPendentes(): string[] {
  return Object.entries(DADOS_JURIDICOS)
    .filter(([, valor]) => valor.trim() === '')
    .map(([campo]) => campo);
}

export function juridicoCompleto(): boolean {
  return camposJuridicosPendentes().length === 0;
}
