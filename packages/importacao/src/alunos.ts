import type { LinhaPrevia, MapeamentoColunas, ResumoImportacao } from '@notaa/contracts';
import { normalizarTexto } from './campos';
import type { Planilha } from './ler-planilha';
import { celula, emailValido, normalizarData, telefoneValido } from './valores';

// Plano da importação de alunos. Puro: recebe a planilha, o mapeamento e o que
// já existe no banco (contexto), e diz o que fazer com cada linha. A prévia da
// API e a gravação do worker usam ESTA função — o que a tela mostra é o que o
// worker faz.

export interface ResponsavelExistente {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  parentesco: string | null;
  usuarioId: string | null;
}

export interface AlunoExistente {
  id: string;
  matricula: string;
  nome: string;
  dataNascimento: string | null;
  email: string | null;
  turmaId: string | null;
  responsaveis: ResponsavelExistente[];
}

export interface ContextoAlunos {
  /** Turmas ATIVAS da instituição, pelo nome normalizado. Mais de um id = nome ambíguo. */
  turmasPorNome: Map<string, string[]>;
  /** Cadastros existentes, pela matrícula exata. */
  alunosPorMatricula: Map<string, AlunoExistente>;
}

/**
 * Responsável como CONTATO da secretaria. Nunca carrega uma conta: ligar o
 * responsável a um usuário é por convite aceito e consentimento (migração 0016),
 * não por coincidência de e-mail na planilha.
 */
export interface ResponsavelPlanejado {
  nome: string;
  email: string;
  telefone: string | null;
  parentesco: string | null;
}

export interface DadosAluno {
  matricula: string;
  nome: string;
  dataNascimento: string | null;
  email: string | null;
  turmaId: string | null;
}

export interface ItemPlanoAlunos {
  previa: LinhaPrevia;
  dados: DadosAluno | null;
  /** Cadastro existente, quando a linha atualiza ou não muda nada. */
  existenteId: string | null;
  /** Só os campos do aluno que mudam. Vazio = aluno igual. */
  camposAlterados: Partial<DadosAluno>;
  responsaveisNovos: ResponsavelPlanejado[];
  responsaveisAlterados: { id: string; antes: ResponsavelExistente; depois: ResponsavelPlanejado }[];
}

export interface PlanoImportacao<T> {
  resumo: ResumoImportacao;
  itens: T[];
}

const MATRICULA = /^[\p{L}\p{N}._/-]{1,40}$/u;

function opcional(valor: string): string | null {
  return valor === '' ? null : valor;
}

interface LinhaLida {
  numero: number;
  matricula: string;
  nome: string;
  motivos: string[];
  dados: DadosAluno | null;
  responsaveis: ResponsavelPlanejado[];
}

function lerLinha(
  numero: number,
  celulas: string[],
  mapeamento: MapeamentoColunas,
  contexto: ContextoAlunos,
): LinhaLida {
  const v = (campo: string) => celula(celulas, mapeamento, campo);
  const motivos: string[] = [];

  const matricula = v('matricula');
  if (matricula === '') motivos.push('Matrícula em branco.');
  else if (!MATRICULA.test(matricula)) motivos.push('Matrícula com caractere inválido ou longa demais.');

  const nome = v('nome');
  if (nome.length < 2) motivos.push('Nome do aluno em branco.');
  else if (nome.length > 200) motivos.push('Nome do aluno longo demais.');

  const dataBruta = v('data_nascimento');
  const dataNascimento = dataBruta === '' ? null : normalizarData(dataBruta);
  if (dataBruta !== '' && !dataNascimento) motivos.push(`Data de nascimento inválida: "${dataBruta}".`);

  const email = opcional(v('email').toLowerCase());
  if (email && !emailValido(email)) motivos.push(`E-mail do aluno inválido: "${email}".`);

  let turmaId: string | null = null;
  const turma = v('turma');
  if (turma !== '') {
    const ids = contexto.turmasPorNome.get(normalizarTexto(turma)) ?? [];
    if (ids.length === 0) motivos.push(`Turma "${turma}" não existe ou está arquivada.`);
    else if (ids.length > 1) motivos.push(`Há mais de uma turma ativa chamada "${turma}".`);
    else turmaId = ids[0]!;
  }

  const responsaveis: ResponsavelPlanejado[] = [];
  for (const n of [1, 2]) {
    const p = `responsavel${n}`;
    const rNome = v(`${p}_nome`);
    const rEmail = v(`${p}_email`).toLowerCase();
    const rTelefone = v(`${p}_telefone`);
    const rParentesco = v(`${p}_parentesco`);
    if (!rNome && !rEmail && !rTelefone && !rParentesco) continue;
    if (rNome.length < 2) motivos.push(`Responsável ${n} sem nome.`);
    if (!rEmail) motivos.push(`Responsável ${n} sem e-mail.`);
    else if (!emailValido(rEmail)) motivos.push(`E-mail do responsável ${n} inválido: "${rEmail}".`);
    if (rTelefone && !telefoneValido(rTelefone)) motivos.push(`Telefone do responsável ${n} inválido.`);
    if (rParentesco.length > 40) motivos.push(`Parentesco do responsável ${n} longo demais.`);
    if (responsaveis.some((r) => r.email === rEmail)) {
      motivos.push('Os dois responsáveis têm o mesmo e-mail.');
    }
    responsaveis.push({
      nome: rNome,
      email: rEmail,
      telefone: opcional(rTelefone),
      parentesco: opcional(rParentesco),
    });
  }

  return {
    numero,
    matricula,
    nome,
    motivos,
    dados: motivos.length ? null : { matricula, nome, dataNascimento, email, turmaId },
    responsaveis,
  };
}

const ROTULOS: Record<keyof DadosAluno, string> = {
  matricula: 'matrícula',
  nome: 'nome',
  dataNascimento: 'data de nascimento',
  email: 'e-mail',
  turmaId: 'turma',
};

function diferencas(antes: AlunoExistente, depois: DadosAluno): Partial<DadosAluno> {
  const mudou: Partial<DadosAluno> = {};
  if (antes.nome !== depois.nome) mudou.nome = depois.nome;
  if (antes.dataNascimento !== depois.dataNascimento) mudou.dataNascimento = depois.dataNascimento;
  if ((antes.email ?? null) !== depois.email) mudou.email = depois.email;
  // Célula de turma em branco não tira o aluno da turma: só uma turma
  // informada troca a de referência.
  if (depois.turmaId !== null && antes.turmaId !== depois.turmaId) mudou.turmaId = depois.turmaId;
  return mudou;
}

export function planejarAlunos(
  planilha: Planilha,
  mapeamento: MapeamentoColunas,
  contexto: ContextoAlunos,
): PlanoImportacao<ItemPlanoAlunos> {
  const lidas = planilha.linhas.map((l) => lerLinha(l.numero, l.celulas, mapeamento, contexto));

  // Matrícula repetida no arquivo: não dá para saber qual linha vale, então
  // TODAS as ocorrências são recusadas.
  const ocorrencias = new Map<string, number[]>();
  for (const l of lidas) {
    if (!l.matricula) continue;
    ocorrencias.set(l.matricula, [...(ocorrencias.get(l.matricula) ?? []), l.numero]);
  }

  const resumo: ResumoImportacao = { criar: 0, atualizar: 0, sem_alteracao: 0, recusar: 0 };
  const itens = lidas.map((l): ItemPlanoAlunos => {
    const repetidas = ocorrencias.get(l.matricula) ?? [];
    if (repetidas.length > 1) {
      const outras = repetidas.filter((n) => n !== l.numero).join(', ');
      l.motivos.push(`Matrícula repetida no arquivo (também na linha ${outras}).`);
    }
    const vazio = {
      dados: null,
      existenteId: null,
      camposAlterados: {},
      responsaveisNovos: [],
      responsaveisAlterados: [],
    };
    if (l.motivos.length || !l.dados) {
      resumo.recusar++;
      return {
        ...vazio,
        previa: { linha: l.numero, acao: 'recusar', chave: l.matricula || null, nome: l.nome || null, motivos: l.motivos },
      };
    }

    const existente = contexto.alunosPorMatricula.get(l.matricula);
    if (!existente) {
      resumo.criar++;
      return {
        ...vazio,
        dados: l.dados,
        responsaveisNovos: l.responsaveis,
        previa: { linha: l.numero, acao: 'criar', chave: l.matricula, nome: l.nome, motivos: [] },
      };
    }

    const camposAlterados = diferencas(existente, l.dados);
    const motivos = Object.keys(camposAlterados).map(
      (c) => `Muda ${ROTULOS[c as keyof DadosAluno]}.`,
    );
    const responsaveisNovos: ResponsavelPlanejado[] = [];
    const responsaveisAlterados: ItemPlanoAlunos['responsaveisAlterados'] = [];
    for (const r of l.responsaveis) {
      const atual = existente.responsaveis.find((e) => e.email.toLowerCase() === r.email);
      if (!atual) {
        responsaveisNovos.push(r);
        motivos.push(`Vincula o responsável ${r.email}.`);
        continue;
      }
      const depois: ResponsavelPlanejado = {
        nome: r.nome,
        email: atual.email,
        // Célula em branco não apaga telefone nem parentesco já cadastrados.
        telefone: r.telefone ?? atual.telefone,
        parentesco: r.parentesco ?? atual.parentesco,
      };
      if (
        depois.nome !== atual.nome ||
        depois.telefone !== atual.telefone ||
        depois.parentesco !== atual.parentesco
      ) {
        responsaveisAlterados.push({ id: atual.id, antes: atual, depois });
        motivos.push(`Atualiza o responsável ${r.email}.`);
      }
    }

    const muda = motivos.length > 0;
    resumo[muda ? 'atualizar' : 'sem_alteracao']++;
    return {
      dados: l.dados,
      existenteId: existente.id,
      camposAlterados,
      responsaveisNovos,
      responsaveisAlterados,
      previa: {
        linha: l.numero,
        acao: muda ? 'atualizar' : 'sem_alteracao',
        chave: l.matricula,
        nome: l.nome,
        motivos,
      },
    };
  });

  return { resumo, itens };
}
