import type { CampoImportacao, MapeamentoColunas, TipoImportacao } from '@notaa/contracts';

interface DefinicaoCampo extends CampoImportacao {
  /** Cabeçalhos que a sugestão automática reconhece, já normalizados. */
  sinonimos: string[];
}

function responsavel(n: 1 | 2): DefinicaoCampo[] {
  const p = `responsavel${n}`;
  const r = `Responsável ${n}`;
  return [
    { campo: `${p}_nome`, rotulo: `${r}: nome`, obrigatorio: false, descricao: null, sinonimos: [`${p} nome`, `nome responsavel ${n}`, `nome do responsavel ${n}`, ...(n === 1 ? ['responsavel', 'nome do responsavel', 'nome responsavel'] : [])] },
    { campo: `${p}_email`, rotulo: `${r}: e-mail`, obrigatorio: false, descricao: 'É por ele que o responsável é reconhecido.', sinonimos: [`${p} email`, `email responsavel ${n}`, `email do responsavel ${n}`, ...(n === 1 ? ['email do responsavel', 'email responsavel'] : [])] },
    { campo: `${p}_telefone`, rotulo: `${r}: telefone`, obrigatorio: false, descricao: null, sinonimos: [`${p} telefone`, `telefone responsavel ${n}`, ...(n === 1 ? ['telefone do responsavel', 'telefone responsavel', 'telefone'] : [])] },
    { campo: `${p}_parentesco`, rotulo: `${r}: parentesco`, obrigatorio: false, descricao: null, sinonimos: [`${p} parentesco`, `parentesco ${n}`, ...(n === 1 ? ['parentesco'] : [])] },
  ];
}

const CAMPOS: Record<TipoImportacao, DefinicaoCampo[]> = {
  alunos: [
    { campo: 'matricula', rotulo: 'Matrícula', obrigatorio: true, descricao: 'Identifica o aluno. Reimportar a mesma matrícula atualiza em vez de duplicar.', sinonimos: ['matricula', 'n matricula', 'numero de matricula', 'ra', 'registro academico', 'codigo do aluno'] },
    { campo: 'nome', rotulo: 'Nome do aluno', obrigatorio: true, descricao: null, sinonimos: ['nome', 'nome do aluno', 'aluno', 'nome completo', 'estudante'] },
    { campo: 'data_nascimento', rotulo: 'Data de nascimento', obrigatorio: false, descricao: 'dd/mm/aaaa ou aaaa-mm-dd.', sinonimos: ['data nascimento', 'data de nascimento', 'nascimento', 'dt nasc', 'dt nascimento'] },
    { campo: 'email', rotulo: 'E-mail do aluno', obrigatorio: false, descricao: null, sinonimos: ['email', 'email do aluno', 'email aluno'] },
    { campo: 'turma', rotulo: 'Turma', obrigatorio: false, descricao: 'Nome exato de uma turma ativa da instituição.', sinonimos: ['turma', 'classe', 'sala', 'serie turma'] },
    ...responsavel(1),
    ...responsavel(2),
  ],
  disciplinas: [
    { campo: 'nome', rotulo: 'Nome da disciplina', obrigatorio: true, descricao: 'Identifica a disciplina. Reimportar o mesmo nome atualiza.', sinonimos: ['nome', 'disciplina', 'nome da disciplina', 'componente curricular'] },
    { campo: 'codigo', rotulo: 'Código', obrigatorio: false, descricao: null, sinonimos: ['codigo', 'cod', 'sigla'] },
    { campo: 'area_enem', rotulo: 'Área do ENEM', obrigatorio: false, descricao: 'Linguagens, Humanas, Natureza, Matemática ou Redação.', sinonimos: ['area', 'area enem', 'area do enem', 'area de conhecimento'] },
  ],
};

/** Minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function camposDoTipo(tipo: TipoImportacao): CampoImportacao[] {
  return CAMPOS[tipo].map(({ campo, rotulo, obrigatorio, descricao }) => ({
    campo,
    rotulo,
    obrigatorio,
    descricao,
  }));
}

/**
 * Sugere qual coluna vai em cada campo. Primeiro pelo mapeamento salvo da
 * importação anterior do mesmo tipo (por NOME de cabeçalho, porque a ordem das
 * colunas pode mudar entre arquivos); depois por sinônimo.
 */
export function sugerirMapeamento(
  tipo: TipoImportacao,
  cabecalhos: string[],
  anterior?: { cabecalhos: string[]; mapeamento: MapeamentoColunas } | null,
): MapeamentoColunas {
  // Sem espaços na comparação: "E-mail", "e mail" e "email" são o mesmo cabeçalho.
  const compacto = (s: string) => normalizarTexto(s).replace(/ /g, '');
  const normalizados = cabecalhos.map(compacto);
  const usados = new Set<number>();
  const mapeamento: MapeamentoColunas = {};

  for (const def of CAMPOS[tipo]) {
    let indice: number | null = null;
    const colunaAnterior = anterior?.mapeamento[def.campo];
    if (anterior && colunaAnterior !== null && colunaAnterior !== undefined) {
      const nome = anterior.cabecalhos[colunaAnterior];
      const achado = nome === undefined ? -1 : normalizados.indexOf(compacto(nome));
      if (achado >= 0 && !usados.has(achado)) indice = achado;
    }
    if (indice === null) {
      const candidatos = [def.campo, ...def.sinonimos].map(compacto);
      const achado = normalizados.findIndex((h, i) => !usados.has(i) && candidatos.includes(h));
      if (achado >= 0) indice = achado;
    }
    if (indice !== null) usados.add(indice);
    mapeamento[def.campo] = indice;
  }
  return mapeamento;
}

/** Erros do mapeamento em si: campo obrigatório sem coluna, coluna repetida, campo desconhecido. */
export function validarMapeamento(
  tipo: TipoImportacao,
  mapeamento: MapeamentoColunas,
  totalColunas: number,
): string[] {
  const erros: string[] = [];
  const conhecidos = new Set(CAMPOS[tipo].map((c) => c.campo));
  for (const campo of Object.keys(mapeamento)) {
    if (!conhecidos.has(campo)) erros.push(`Campo desconhecido: ${campo}.`);
  }
  const vistos = new Map<number, string>();
  for (const def of CAMPOS[tipo]) {
    const coluna = mapeamento[def.campo];
    if (coluna === null || coluna === undefined) {
      if (def.obrigatorio) erros.push(`Escolha a coluna de "${def.rotulo}".`);
      continue;
    }
    if (coluna >= totalColunas) erros.push(`A coluna escolhida para "${def.rotulo}" não existe.`);
    const outro = vistos.get(coluna);
    if (outro) erros.push(`"${def.rotulo}" e "${outro}" estão na mesma coluna.`);
    vistos.set(coluna, def.rotulo);
  }
  return erros;
}

/** Cabeçalho do modelo para download: os campos na ordem, pelo nome técnico. */
export function cabecalhoDoModelo(tipo: TipoImportacao): string[] {
  return CAMPOS[tipo].map((c) => c.campo);
}
