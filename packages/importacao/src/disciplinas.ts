import type { AreaEnem, LinhaPrevia, MapeamentoColunas, ResumoImportacao } from '@notaa/contracts';
import type { PlanoImportacao } from './alunos';
import { normalizarTexto } from './campos';
import type { Planilha } from './ler-planilha';
import { celula } from './valores';

export interface DisciplinaExistente {
  id: string;
  nome: string;
  codigo: string | null;
  areaEnem: AreaEnem | null;
}

export interface ContextoDisciplinas {
  /** Disciplinas da instituição (inclusive arquivadas), pelo nome normalizado. */
  porNome: Map<string, DisciplinaExistente>;
}

export interface DadosDisciplina {
  nome: string;
  codigo: string | null;
  areaEnem: AreaEnem | null;
}

export interface ItemPlanoDisciplinas {
  previa: LinhaPrevia;
  dados: DadosDisciplina | null;
  existenteId: string | null;
  camposAlterados: Partial<DadosDisciplina>;
}

const AREAS: Record<string, AreaEnem> = {
  linguagens: 'linguagens',
  'linguagens codigos e suas tecnologias': 'linguagens',
  humanas: 'humanas',
  'ciencias humanas': 'humanas',
  'ciencias humanas e suas tecnologias': 'humanas',
  natureza: 'natureza',
  'ciencias da natureza': 'natureza',
  'ciencias da natureza e suas tecnologias': 'natureza',
  matematica: 'matematica',
  'matematica e suas tecnologias': 'matematica',
  redacao: 'redacao',
};

export function planejarDisciplinas(
  planilha: Planilha,
  mapeamento: MapeamentoColunas,
  contexto: ContextoDisciplinas,
): PlanoImportacao<ItemPlanoDisciplinas> {
  const resumo: ResumoImportacao = { criar: 0, atualizar: 0, sem_alteracao: 0, recusar: 0 };
  const chaves = new Map<string, number[]>();
  for (const l of planilha.linhas) {
    const chave = normalizarTexto(celula(l.celulas, mapeamento, 'nome'));
    if (chave) chaves.set(chave, [...(chaves.get(chave) ?? []), l.numero]);
  }

  const itens = planilha.linhas.map((l): ItemPlanoDisciplinas => {
    const v = (campo: string) => celula(l.celulas, mapeamento, campo);
    const motivos: string[] = [];
    const nome = v('nome');
    if (nome.length < 2) motivos.push('Nome da disciplina em branco.');
    if (nome.length > 80) motivos.push('Nome da disciplina longo demais.');
    const codigo = v('codigo') || null;
    if (codigo && codigo.length > 20) motivos.push('Código longo demais.');
    const areaBruta = v('area_enem');
    const areaEnem = areaBruta ? (AREAS[normalizarTexto(areaBruta)] ?? null) : null;
    if (areaBruta && !areaEnem) motivos.push(`Área do ENEM desconhecida: "${areaBruta}".`);
    const repetidas = chaves.get(normalizarTexto(nome)) ?? [];
    if (repetidas.length > 1) motivos.push('Disciplina repetida no arquivo.');

    if (motivos.length) {
      resumo.recusar++;
      return {
        previa: { linha: l.numero, acao: 'recusar', chave: nome || null, nome: nome || null, motivos },
        dados: null,
        existenteId: null,
        camposAlterados: {},
      };
    }
    const dados = { nome, codigo, areaEnem };
    const existente = contexto.porNome.get(normalizarTexto(nome));
    if (!existente) {
      resumo.criar++;
      return {
        previa: { linha: l.numero, acao: 'criar', chave: nome, nome, motivos: [] },
        dados,
        existenteId: null,
        camposAlterados: {},
      };
    }
    const camposAlterados: Partial<DadosDisciplina> = {};
    if (codigo !== null && codigo !== existente.codigo) camposAlterados.codigo = codigo;
    if (areaEnem !== null && areaEnem !== existente.areaEnem) camposAlterados.areaEnem = areaEnem;
    const muda = Object.keys(camposAlterados).length > 0;
    resumo[muda ? 'atualizar' : 'sem_alteracao']++;
    return {
      previa: {
        linha: l.numero,
        acao: muda ? 'atualizar' : 'sem_alteracao',
        chave: nome,
        nome,
        motivos: Object.keys(camposAlterados).map((c) => (c === 'codigo' ? 'Muda código.' : 'Muda área do ENEM.')),
      },
      dados,
      existenteId: existente.id,
      camposAlterados,
    };
  });
  return { resumo, itens };
}
