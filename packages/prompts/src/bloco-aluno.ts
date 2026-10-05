// packages/prompts — "Bloco do aluno": a ÚNICA tradução de dados do estudante
// para linguagem que o modelo consegue usar. Cada prompt de canal recebe este
// bloco em `{{blocoAluno}}` e diz, na sua própria seção, o que fazer com ele.
//
// Função PURA: recebe fatos já coletados (apps/api/modules/ai/student-profile
// .service.ts lê o banco) e devolve texto. Não sabe de Drizzle nem de Nest.
//
// Princípios (decididos com o produto em 2026-09-15):
//   1. Nunca mandar número cru (eixo 0.42, theta -0.3). Todo dado vira rótulo.
//   2. Cada rótulo vem acompanhado de uma instrução do que fazer com ele NESTE
//      canal — o mesmo fato "impulsivo" vira instruções diferentes no tutor,
//      no corretor e no quiz.
//   3. Aluno sem dados recebe um bloco que diz isso, nunca um perfil inventado
//      ("Visual e Prático" como fallback era personalização de mentira).
//   4. Dado sensível (neurodivergência) NÃO entra aqui — I10/doc 10.

export type CanalIa = 'socratica' | 'redacao' | 'quiz' | 'batalha' | 'trilha';

export type TracoCognitivo =
  | 'visual'
  | 'verbal'
  | 'analitico'
  | 'holistico'
  | 'sequencial'
  | 'global'
  | 'reflexivo'
  | 'impulsivo';

export type NivelProficiencia = 'iniciante' | 'intermediario' | 'avancado';

export type Autopercepcao = 'passo_a_passo' | 'desafio';

/** Fatos sobre o aluno já normalizados. Tudo opcional: ausência é informação. */
export interface FatosAluno {
  nome: string | null;
  idade: number | null;
  serie: string | null;
  /** Já legível ("Medicina"), nunca o id do formulário ("medicina"). */
  objetivo: string | null;
  notaAlvo: number | null;
  /** Autodeclarado no onboarding: 'Visual' | 'Auditivo' | 'Prático'. */
  estilosDeclarados: string[];
  /** Autodeclarado no onboarding: 'Matemática', 'Redação', ... */
  dificuldadesDeclaradas: string[];
  minutosPorDia: number | null;
  autopercepcao: Autopercepcao | null;
  /** Traços do Perfil 4D que passaram no limiar de confiança — já filtrados. */
  tracosObservados: TracoCognitivo[];
  /** 0..1 — confiança acumulada do Perfil 4D. */
  confiancaPerfil: number;
  /** Só áreas com medição real (mínimo de tentativas). Chave = AreaConhecimento. */
  nivelPorArea: Partial<Record<string, NivelProficiencia>>;
  /** Temas/competências das últimas respostas erradas, já sem marcadores internos. */
  temasErradosRecentes: string[];
  /** Descrições das recomendações ativas do Cognitive Profiler. */
  recomendacoesAtivas: string[];
}

export const FATOS_VAZIOS: FatosAluno = {
  nome: null,
  idade: null,
  serie: null,
  objetivo: null,
  notaAlvo: null,
  estilosDeclarados: [],
  dificuldadesDeclaradas: [],
  minutosPorDia: null,
  autopercepcao: null,
  tracosObservados: [],
  confiancaPerfil: 0,
  nivelPorArea: {},
  temasErradosRecentes: [],
  recomendacoesAtivas: [],
};

/** Nome legível de cada AreaConhecimento (a sigla interna não diz nada ao modelo). */
export const NOME_AREA: Record<string, string> = {
  linguagens: 'Linguagens, Códigos e suas Tecnologias',
  humanas: 'Ciências Humanas',
  natureza: 'Ciências da Natureza',
  matematica: 'Matemática',
  redacao: 'Redação',
  fin: 'Educação Financeira',
  soc: 'Competências Socioemocionais',
  art: 'Artes e Cultura',
};

export function nomeArea(area: string): string {
  return NOME_AREA[area] ?? area;
}

const ROTULO_TRACO: Record<TracoCognitivo, string> = {
  visual: 'aprende melhor vendo (esquemas, tabelas, relações espaciais)',
  verbal: 'aprende melhor lendo e explicando com palavras',
  analitico: 'prefere entender a regra geral antes do exemplo',
  holistico: 'prefere ver o panorama e o contexto antes do detalhe',
  sequencial: 'avança melhor em passos ordenados, um de cada vez',
  global: 'precisa ver onde a parte se encaixa no todo para engajar',
  reflexivo: 'pensa antes de responder; demora, mas erra pouco por desatenção',
  impulsivo: 'responde rápido e tende a errar por leitura apressada',
};

const NOME_NIVEL: Record<NivelProficiencia, string> = {
  iniciante: 'iniciante',
  intermediario: 'intermediário',
  avancado: 'avançado',
};

const ROTULO_NIVEL: Record<NivelProficiencia, string> = {
  iniciante: 'iniciante (erra a maioria das questões médias)',
  intermediario: 'intermediário (acerta questões médias, erra as difíceis)',
  avancado: 'avançado (acerta a maioria, inclusive difíceis)',
};

// ── Tabela de adaptação: (fato) × (canal) → instrução ───────────────────────
// Cada linha é uma instrução concreta e curta. Quem não tiver entrada para um
// canal simplesmente não aparece naquele canal (ex.: batalha só usa nível).

type Adaptacao = Partial<Record<CanalIa, string>>;

const ADAPTACAO_ESTILO: Record<string, Adaptacao> = {
  Visual: {
    socratica:
      'Peça que ele organize o que já sabe numa tabela, esquema ou lista numerada antes de avançar; descreva relações de forma espacial ("de um lado... do outro...").',
    redacao:
      'Na dica personalizada, sugira planejar a redação com um mapa mental ou esquema de tese, argumentos e proposta antes de escrever.',
    quiz: 'Prefira enunciados com dados organizados em tabela ou com um gráfico descrito em palavras; a explicação deve vir em passos numerados.',
    trilha: 'Passos baseados em mapa mental, resumo visual, tabela comparativa ou esquema desenhado à mão.',
  },
  Auditivo: {
    socratica:
      'Use frases fluidas, como numa aula falada; peça que ele explique em voz alta (ou por escrito, como se falasse) o raciocínio.',
    redacao:
      'Na dica personalizada, sugira ler o texto em voz alta para perceber problemas de coesão e ritmo.',
    quiz: 'Enunciado em prosa clara, com uma situação narrada; a explicação deve soar como alguém explicando em voz alta.',
    trilha: 'Passos com explicação em voz alta, gravar um áudio resumindo o tema, ou ensinar o conteúdo para alguém.',
  },
  Prático: {
    socratica:
      'Ancore cada pergunta numa situação concreta do cotidiano antes de ir para a teoria.',
    redacao:
      'Na dica personalizada, ligue a melhoria a um exemplo concreto de repertório ou de proposta que ele poderia usar.',
    quiz: 'Contextualize o enunciado numa situação real e aplicada (compra, medida, notícia, experimento).',
    trilha: 'Cada passo termina com uma aplicação prática ou uma questão resolvida, não só leitura.',
  },
};

const ADAPTACAO_TRACO: Record<TracoCognitivo, Adaptacao> = {
  visual: ADAPTACAO_ESTILO.Visual!,
  verbal: {
    socratica: 'Peça que ele reformule o problema com as próprias palavras; explicações em texto funcionam bem.',
    quiz: 'Enunciado que exige interpretação de um trecho de texto é adequado para ele.',
    redacao: 'Feedback em texto corrido funciona; não precisa de esquema.',
    trilha: 'Passos com leitura de resumo e escrita de explicação própria.',
  },
  analitico: {
    socratica: 'Apresente (via pergunta) a regra geral antes do exemplo; ele quer entender o porquê.',
    quiz: 'Prefira questão que exige aplicar uma regra ou princípio, não só reconhecer um fato.',
    redacao: 'Na justificativa, cite o critério da competência primeiro e depois o trecho.',
    trilha: 'Comece cada passo pela teoria e só depois pela prática.',
  },
  holistico: {
    socratica: 'Comece pelo contexto e pelo panorama do problema, depois desça ao detalhe.',
    quiz: 'Enunciado com contexto amplo antes do comando específico.',
    redacao: 'Comece o feedback geral pelo efeito do texto como um todo, depois os detalhes.',
    trilha: 'Passo 1 deve situar o tema no todo da área antes de detalhar.',
  },
  sequencial: {
    socratica: 'Um passo por vez, em ordem; confirme cada passo antes de propor o próximo.',
    quiz: 'Questão de procedimento em etapas encadeadas funciona bem.',
    trilha: 'Passos estritamente ordenados, cada um dependendo do anterior.',
  },
  global: {
    socratica: 'Mostre (via pergunta) onde a dúvida se encaixa no objetivo maior antes de detalhar.',
    trilha: 'Explique no início o que a trilha inteira vai resolver; ele precisa ver o destino.',
  },
  reflexivo: {
    socratica: 'Dê espaço: perguntas mais abertas, sem pressa; não encha de dicas.',
    quiz: 'Pode usar enunciado mais longo que exige leitura cuidadosa.',
  },
  impulsivo: {
    socratica:
      'Antes de qualquer cálculo, peça que ele releia o enunciado e diga com as próprias palavras o que a questão pede.',
    redacao: 'Na dica personalizada, sugira uma releitura final procurando erros de desatenção e de concordância.',
    quiz: 'Inclua ao menos um distrator que pune leitura apressada (ex.: o valor de x quando a questão pede 2x) e aponte isso na explicação.',
    trilha: 'Inclua um passo de revisão/releitura consciente.',
  },
};

const ADAPTACAO_AUTOPERCEPCAO: Record<Autopercepcao, Adaptacao> = {
  passo_a_passo: {
    socratica: 'Ele prefere ser guiado: quebre o problema em etapas pequenas e confirme cada uma.',
    quiz: 'Enunciado direto, sem pegadinha desnecessária.',
    trilha: 'Passos curtos com teoria + exercício guiado.',
  },
  desafio: {
    socratica: 'Ele prefere desafio: pode ser mais direto e fazer perguntas que exigem um salto de raciocínio.',
    quiz: 'Enunciado no nível real do ENEM, sem simplificar.',
    trilha: 'Priorize questões e simulados sobre leitura de teoria.',
  },
};

const ADAPTACAO_NIVEL: Record<NivelProficiencia, Adaptacao> = {
  iniciante: {
    socratica: 'Perguntas menores, uma ideia por vez; reconheça acertos parciais.',
    quiz: 'A dificuldade deve ser Fácil; contextualize com o cotidiano; explicação bem detalhada.',
    batalha: 'Questões de dificuldade fácil a média.',
    redacao: 'Concentre o feedback na competência com menor nota; não sobrecarregue com tudo de uma vez.',
    trilha: 'Comece pelo fundamento do tema, não pela questão de prova.',
  },
  intermediario: {
    socratica: 'Perguntas de tamanho médio; pode exigir que ele ligue dois conceitos.',
    quiz: 'A dificuldade deve ser Média, salvo instrução explícita em contrário.',
    batalha: 'Questões de dificuldade média.',
    redacao: 'Feedback equilibrado entre as competências; aponte a que mais limita a nota.',
    trilha: 'Revisão rápida do fundamento e mais tempo em prática.',
  },
  avancado: {
    socratica: 'Perguntas que exigem generalizar ou justificar; ele aguenta salto de raciocínio.',
    quiz: 'A dificuldade deve ser Difícil, com várias etapas ou relação entre conceitos.',
    batalha: 'Questões de dificuldade média a difícil.',
    redacao: 'Feedback focado em refinamento: repertório, precisão de linguagem e detalhamento da proposta.',
    trilha: 'Pouca teoria; questões difíceis e análise dos próprios erros.',
  },
};

function rotuloConfianca(confianca: number): string {
  if (confianca >= 0.7) return 'confiança alta';
  if (confianca >= 0.3) return 'confiança média';
  return 'confiança baixa';
}

function lista(itens: string[]): string {
  return itens.join(', ');
}

function unico<T>(itens: T[]): T[] {
  return [...new Set(itens)];
}

export interface OpcoesBloco {
  /** Área em foco nesta chamada (quiz, batalha) — o nível dela é destacado. */
  areaFoco?: string;
}

/**
 * Monta o bloco de perfil em duas seções: "Sobre este aluno" (fatos em frases)
 * e "Como adaptar a este aluno neste canal" (instruções escolhidas pelo canal).
 */
export function montarBlocoAluno(fatos: FatosAluno, canal: CanalIa, opcoes: OpcoesBloco = {}): string {
  // Redação sempre tem área em foco: a própria redação.
  const opts: OpcoesBloco = { ...opcoes, areaFoco: opcoes.areaFoco ?? (canal === 'redacao' ? 'redacao' : undefined) };

  const fatosLinhas = canal === 'batalha' ? linhasFatosBatalha(fatos, opts) : linhasFatos(fatos, opts);
  const adaptacoes = canal === 'batalha' ? adaptacoesBatalha(fatos, opts) : adaptacoesCanal(fatos, canal, opts);

  const ADAPTACAO_NEUTRA =
    'Ainda não há sinal suficiente sobre como ele aprende. Use uma abordagem neutra: varie formatos (texto, esquema, exemplo do cotidiano), mantenha dificuldade média e observe as respostas dele. Não presuma um estilo.';

  if (canal !== 'batalha' && !temDados(fatos)) {
    fatosLinhas.unshift('Ainda não temos informações sobre este aluno além de que ele se prepara para o ENEM.');
    adaptacoes.unshift(ADAPTACAO_NEUTRA);
  } else if (adaptacoes.length === 0) {
    adaptacoes.push(ADAPTACAO_NEUTRA);
  }

  const secaoFatos = ['## Sobre este aluno', ...fatosLinhas.map((l) => `- ${l}`)].join('\n');
  const secaoAdaptacao = ['## Como adaptar a este aluno neste canal', ...adaptacoes.map((l) => `- ${l}`)].join('\n');

  return `${secaoFatos}\n\n${secaoAdaptacao}`;
}

/** Há algum dado real sobre o aluno (além do id)? Define se o bloco é "neutro". */
function temDados(f: FatosAluno): boolean {
  return Boolean(
    f.nome ||
      f.idade ||
      f.serie ||
      f.objetivo ||
      f.estilosDeclarados.length ||
      f.dificuldadesDeclaradas.length ||
      f.minutosPorDia ||
      f.autopercepcao ||
      f.tracosObservados.length ||
      f.confiancaPerfil > 0 ||
      Object.keys(f.nivelPorArea).length ||
      f.temasErradosRecentes.length ||
      f.recomendacoesAtivas.length,
  );
}

function linhasFatos(f: FatosAluno, opcoes: OpcoesBloco): string[] {
  const linhas: string[] = [];

  const identidade: string[] = [];
  if (f.nome) identidade.push(f.nome);
  if (f.idade) identidade.push(`${f.idade} anos`);
  if (f.serie) identidade.push(f.serie);
  if (identidade.length > 0) linhas.push(`Nome/idade/série: ${identidade.join(', ')}.`);

  if (f.objetivo) {
    linhas.push(
      `Objetivo no ENEM: ${f.objetivo}${f.notaAlvo ? ` (mira nota ${f.notaAlvo})` : ''}.`,
    );
  }

  if (f.estilosDeclarados.length > 0) {
    linhas.push(`Diz aprender melhor de forma: ${lista(f.estilosDeclarados.map((e) => e.toLowerCase()))}.`);
  }

  if (f.autopercepcao === 'passo_a_passo') linhas.push('Prefere estudar passo a passo, com teoria e prática guiada.');
  if (f.autopercepcao === 'desafio') linhas.push('Prefere estudar por desafio, direto em questões e simulados.');

  if (f.dificuldadesDeclaradas.length > 0) {
    linhas.push(`Dificuldades que ele mesmo declarou: ${lista(f.dificuldadesDeclaradas)}.`);
  }

  if (f.minutosPorDia) linhas.push(`Tempo de estudo disponível: cerca de ${f.minutosPorDia} minutos por dia.`);

  if (f.tracosObservados.length > 0) {
    const tracos = f.tracosObservados.map((t) => ROTULO_TRACO[t]);
    linhas.push(`Perfil observado nas respostas (${rotuloConfianca(f.confiancaPerfil)}): ${tracos.join('; ')}.`);
  } else if (f.confiancaPerfil > 0) {
    linhas.push('Perfil observado nas respostas: ainda equilibrado, sem tendência clara.');
  }

  const niveis = Object.entries(f.nivelPorArea);
  if (niveis.length > 0) {
    const foco = opcoes.areaFoco && f.nivelPorArea[opcoes.areaFoco];
    if (foco) {
      linhas.push(`Nível em ${nomeArea(opcoes.areaFoco!)} (área desta atividade): ${ROTULO_NIVEL[foco]}.`);
    }
    const outros = niveis.filter(([area]) => area !== opcoes.areaFoco);
    if (outros.length > 0) {
      const rotulo = foco ? 'Nível medido nas outras áreas' : 'Nível medido por área';
      linhas.push(`${rotulo}: ${outros.map(([area, n]) => `${nomeArea(area)} ${NOME_NIVEL[n!]}`).join('; ')}.`);
    }
  } else if (opcoes.areaFoco) {
    linhas.push(`Nível em ${nomeArea(opcoes.areaFoco)}: ainda não medido (poucas respostas).`);
  }

  if (f.temasErradosRecentes.length > 0) {
    linhas.push(`Errou recentemente questões sobre: ${lista(unico(f.temasErradosRecentes))}.`);
  }

  if (f.recomendacoesAtivas.length > 0) {
    linhas.push(`Recomendações do sistema de perfil: ${f.recomendacoesAtivas.join(' ')}`);
  }

  return linhas;
}

function adaptacoesCanal(f: FatosAluno, canal: CanalIa, opcoes: OpcoesBloco): string[] {
  const linhas: string[] = [];

  if (f.nome && canal !== 'quiz') {
    linhas.push(`Chame o aluno pelo nome (${f.nome}) com naturalidade, sem repetir em toda frase.`);
  }

  // Estilo autodeclarado e traço observado podem apontar a mesma coisa
  // (Visual declarado + visual observado): deduplicamos pela instrução.
  const instrucoes: string[] = [];
  for (const estilo of f.estilosDeclarados) instrucoes.push(ADAPTACAO_ESTILO[estilo]?.[canal] ?? '');
  for (const traco of f.tracosObservados) instrucoes.push(ADAPTACAO_TRACO[traco][canal] ?? '');
  if (f.autopercepcao) instrucoes.push(ADAPTACAO_AUTOPERCEPCAO[f.autopercepcao][canal] ?? '');
  linhas.push(...unico(instrucoes.filter(Boolean)));

  const nivelFoco = opcoes.areaFoco ? f.nivelPorArea[opcoes.areaFoco] : undefined;
  if (nivelFoco) {
    const instrucao = ADAPTACAO_NIVEL[nivelFoco][canal];
    if (instrucao) linhas.push(instrucao);
  } else if (canal === 'quiz' && opcoes.areaFoco) {
    linhas.push('Sem nível medido nesta área: siga a dificuldade solicitada e não presuma que ele é fraco ou forte.');
  }

  if (f.dificuldadesDeclaradas.length > 0) {
    if (canal === 'socratica') {
      linhas.push(
        `Se o tema tocar em ${lista(f.dificuldadesDeclaradas)}, vá mais devagar: são dificuldades que ele mesmo declarou.`,
      );
    }
    if (canal === 'redacao' && f.dificuldadesDeclaradas.some((d) => /reda/i.test(d))) {
      linhas.push('Ele declarou dificuldade em redação: explique o critério da competência antes de apontar o erro.');
    }
    if (canal === 'trilha') {
      linhas.push(
        `Se os erros recentes não apontarem um tema, priorize ${lista(f.dificuldadesDeclaradas)}, que ele declarou como dificuldade.`,
      );
    }
  }

  if (f.objetivo && (canal === 'socratica' || canal === 'quiz' || canal === 'trilha')) {
    linhas.push(`Quando couber, ligue o exemplo ao objetivo dele (${f.objetivo}); não force se não fizer sentido.`);
  }

  if (f.minutosPorDia && canal === 'trilha') {
    linhas.push(`Cada passo deve caber em cerca de ${Math.max(10, Math.round(f.minutosPorDia / 2))} minutos.`);
  }

  if (f.temasErradosRecentes.length > 0) {
    if (canal === 'quiz') linhas.push('Se o tema pedido permitir, explore um dos temas que ele errou recentemente.');
    if (canal === 'socratica') linhas.push('Se a dúvida for sobre um tema que ele errou recentemente, comece pelo fundamento, não pela questão.');
  }

  return unico(linhas);
}

// Batalha é entre dois alunos: só calibra dificuldade, não expõe nome nem estilo.
function linhasFatosBatalha(f: FatosAluno, opcoes: OpcoesBloco): string[] {
  const nivel = opcoes.areaFoco ? f.nivelPorArea[opcoes.areaFoco] : undefined;
  if (!nivel) return [`Nível do aluno em ${nomeArea(opcoes.areaFoco ?? '')}: ainda não medido.`];
  return [`Nível do aluno em ${nomeArea(opcoes.areaFoco!)}: ${ROTULO_NIVEL[nivel]}.`];
}

function adaptacoesBatalha(f: FatosAluno, opcoes: OpcoesBloco): string[] {
  const nivel = opcoes.areaFoco ? f.nivelPorArea[opcoes.areaFoco] : undefined;
  if (!nivel) return ['Sem nível medido: distribua as 5 questões de fácil a difícil.'];
  return [ADAPTACAO_NIVEL[nivel].batalha!];
}
