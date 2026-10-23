import { SetMetadata } from '@nestjs/common';

// Rotas que lidam com o PRÓPRIO contexto (listar e trocar). Se elas exigissem um `x-contexto`
// válido, quem ficou com um contexto velho (vínculo removido) não conseguiria nem listar os
// contextos que ainda tem para sair do impasse.
export const SEM_VALIDAR_CONTEXTO_KEY = 'semValidarContexto';
export const SemValidarContexto = () => SetMetadata(SEM_VALIDAR_CONTEXTO_KEY, true);
