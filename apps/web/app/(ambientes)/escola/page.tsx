import { Cabecalho } from '../../_landing/componentes/Cabecalho';
import { FormularioLead } from '../../_landing/componentes/FormularioLead';
import { Confirmar } from '../../_landing/componentes/Marcador';
import { PalcoEscola } from '../../_landing/componentes/Palcos';
import { Rodape } from '../../_landing/componentes/Rodape';
import { BOTAO_ESCOLA, FORM_ESCOLA } from '../../_landing/componentes/estilos';
import { FallbackEscola, FallbackGradeEscola } from '../../_landing/fallbacks/FallbackEscola';
import { metadadosDaPagina } from '../../../lib/site';
import { AbasRecursos, type RecursoDaEscola } from './AbasRecursos';

export const metadata = metadadosDaPagina({
  titulo: 'Nota A para escolas: boletim e frequência com a sua regra de média',
  descricao:
    'Para instituições de ensino: aplique a regra de média da instituição, importe a planilha da secretaria e publique o boletim sem planilha paralela. Agende uma demonstração.',
  caminho: '/escola',
  imagem: 'escola',
});

const H2 = 'font-display text-[clamp(1.875rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.02em] text-amb-navy';

const RECURSOS: RecursoDaEscola[] = [
  {
    id: 'regra',
    rotulo: 'Regra de avaliação',
    titulo: 'A sua regra de média, sem planilha paralela.',
    texto:
      'Defina pesos, média de aprovação e recuperação por disciplina. Cada versão da regra fica guardada, e o boletim fechado guarda a regra usada naquele momento.',
    itens: [{ texto: 'Pesos por tipo de avaliação' }, { texto: 'Média de aprovação e de recuperação' }, { texto: 'Histórico de versões da regra' }],
  },
  {
    id: 'import',
    rotulo: 'Importação',
    titulo: 'A planilha que você já tem entra como está.',
    texto:
      'Envie um arquivo CSV ou XLSX, associe as colunas e veja o que é novo, o que muda e o que precisa de correção antes de confirmar.',
    itens: [{ texto: 'CSV e XLSX' }, { texto: 'Mapeamento de colunas' }, { texto: 'Relatório de linhas com erro' }],
  },
  {
    id: 'boletim',
    rotulo: 'Boletim',
    titulo: 'Do rascunho à publicação, com cada passo registrado.',
    texto: 'O boletim passa por aberto, fechado e publicado. Depois de publicado, só muda por retificação, com justificativa.',
    itens: [
      { texto: 'Pendências antes de fechar' },
      { texto: 'Publicação para alunos e responsáveis' },
      { texto: 'Retificação com justificativa' },
    ],
  },
  {
    id: 'freq',
    rotulo: 'Frequência',
    titulo: 'Presença e faltas sempre à vista.',
    texto:
      'O percentual de cada aluno é calculado pela regra da instituição, e a frequência mínima da regra não pode ficar abaixo de 75%. Faltas justificadas ficam registradas à parte.',
    itens: [
      { texto: 'Percentual por aluno e disciplina' },
      { texto: 'Falta justificada com referência do documento' },
      { texto: 'Alerta de risco de reprovação', aviso: <Confirmar nota="o alerta de risco de reprovação não foi encontrado no produto" /> },
    ],
  },
  {
    id: 'com',
    rotulo: 'Agenda e comunicados',
    titulo: 'Um aviso, e você sabe quem leu.',
    avisoDoTitulo: <Confirmar nota="agenda, comunicados e confirmação de leitura não existem no produto hoje" />,
    texto:
      'Publique eventos na agenda e envie comunicados por turma. Cada pessoa tem a própria confirmação de leitura.',
    itens: [{ texto: 'Agenda por turma' }, { texto: 'Comunicados só em texto' }, { texto: 'Confirmação de leitura por pessoa' }],
  },
];

const ETAPAS = [
  { titulo: 'Levantar a regra', texto: 'Conversamos com a coordenação e registramos pesos, médias e frequência mínima.' },
  { titulo: 'Importar as planilhas', texto: 'Alunos, turmas e vínculos entram por CSV ou XLSX, com relatório de erros.' },
  { titulo: 'Rodar um piloto', texto: 'Uma turma usa o sistema por um período para validar boletim e frequência.' },
  { titulo: 'Expandir', texto: 'As demais turmas entram, e as famílias recebem o convite de acesso.' },
];

const SEGURANCA = [
  { titulo: 'Acesso por papel', texto: 'Coordenação, professor, aluno e responsável veem só o que o papel permite.' },
  {
    titulo: 'Responsável por convite',
    texto: 'O vínculo com o aluno exige convite e confirmação do e-mail cadastrado. Divergências passam pela coordenação.',
  },
  {
    titulo: 'Registro de ações',
    texto: 'Mudanças em notas e boletins ficam registradas por identificador, sem dados pessoais no log.',
  },
];

export default function Escola() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[linear-gradient(170deg,var(--amb-navy)_0%,var(--amb-navy-deep)_100%)] text-amb-on-navy [--amb-focus:var(--amb-accent-light)]">
        <FallbackGradeEscola />
        <Cabecalho
          selo={
            <span className="rounded-sm bg-amb-accent px-2.5 font-text text-[13px] font-bold leading-5 text-amb-on-accent">
              Escola
            </span>
          }
          links={[
            { href: '#recursos', rotulo: 'Recursos' },
            { href: '#etapas', rotulo: 'Implantação' },
            { href: '#seguranca', rotulo: 'Segurança' },
          ]}
          secundario={{ href: '/', rotulo: 'Voltar ao Nota A' }}
          acao={
            <a href="#demo" className={`${BOTAO_ESCOLA.branco} ${BOTAO_ESCOLA.compacto}`}>
              Agendar demonstração
            </a>
          }
          classeDoLink="hover:underline hover:underline-offset-[5px]"
        />
        <main id="conteudo">
          <div className="relative mx-auto flex w-full max-w-landing flex-wrap items-center gap-4 px-5 pb-20 pt-4 md:px-10">
            <div className="flex min-w-0 flex-[1_1_500px] flex-col gap-[26px]">
              <h1 className="max-w-[640px] animate-landing-rise font-display text-[clamp(2.5rem,5vw,4.375rem)] font-semibold leading-[1.07] tracking-[-0.03em] [animation-delay:80ms]">
                A regra de média da sua instituição, aplicada sem planilha paralela.
              </h1>
              <p className="max-w-[540px] animate-landing-rise text-[20px] leading-8 text-amb-on-navy-muted [animation-delay:200ms]">
                Boletim, frequência e importação da planilha que a secretaria já usa, com acesso das famílias por convite.
              </p>
              <div className="flex animate-landing-rise flex-wrap gap-3.5 [animation-delay:320ms]">
                <a href="#demo" className={BOTAO_ESCOLA.branco}>
                  Agendar demonstração
                </a>
                <a href="#recursos" className={BOTAO_ESCOLA.contorno}>
                  Ver os recursos
                </a>
              </div>
            </div>
            <PalcoEscola fallback={<FallbackEscola />} className="h-[380px] min-w-0 flex-[1_1_520px] md:h-[600px]">
              <p className="absolute bottom-0 right-0 m-0 max-w-[220px] text-right text-caption text-amb-on-navy-muted">
                Ilustração com dados de exemplo.
              </p>
            </PalcoEscola>
          </div>
        </main>
      </section>

      <section id="recursos" aria-labelledby="rec" className="mx-auto w-full max-w-landing px-5 pb-6 pt-20 md:px-10">
        <h2 id="rec" className={`${H2} mb-7 max-w-[700px]`}>
          Do cadastro ao boletim publicado.
        </h2>
        <AbasRecursos recursos={RECURSOS} />
      </section>

      <section id="etapas" aria-labelledby="eta" className="mx-auto w-full max-w-landing px-5 pb-6 pt-20 md:px-10">
        <h2 id="eta" className={`${H2} mb-8 max-w-[700px]`}>
          Implantação em quatro etapas.
          <Confirmar nota="é o processo comercial de implantação, não uma função do produto" />
        </h2>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(250px,1fr))] border-t-[3px] border-amb-navy p-0">
          {ETAPAS.map((e, i) => (
            <li key={e.titulo} className={`pb-2 pt-6 ${i === 0 ? 'pr-6' : i === ETAPAS.length - 1 ? 'md:pl-6' : 'md:px-6'}`}>
              <div className="font-display text-[36px] font-semibold leading-10 tabular-nums text-amb-accent">{i + 1}</div>
              <h3 className="my-2 font-display text-[20px] font-semibold leading-7">{e.titulo}</h3>
              <p className="m-0 text-[16.5px] leading-[26px] text-amb-ink-muted">{e.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="seguranca" aria-labelledby="seg" className="mx-auto w-full max-w-landing px-5 pb-6 pt-20 md:px-10">
        <h2 id="seg" className={`${H2} mb-8 max-w-[700px]`}>
          Dados de alunos tratados com cuidado.
        </h2>
        <div className="flex flex-wrap border-t border-amb-line">
          {SEGURANCA.map((s, i) => (
            <div key={s.titulo} className={`flex-[1_1_300px] py-7 ${i === 0 ? 'pr-8' : 'md:border-l md:border-amb-line md:px-8'} ${i === 2 ? 'md:pr-0' : ''}`}>
              <h3 className="mb-2 font-display text-[20px] font-semibold leading-7 text-amb-navy">{s.titulo}</h3>
              <p className="m-0 max-w-[380px] text-[17px] leading-[27px] text-amb-ink-muted">{s.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" aria-labelledby="dem" className="mx-auto w-full max-w-landing px-5 pb-20 pt-16 md:px-10">
        <div className="flex flex-wrap gap-10 rounded-[16px] bg-amb-navy p-6 text-amb-on-navy [--amb-focus:var(--amb-accent-light)] md:p-12">
          <div className="flex flex-[1_1_360px] flex-col justify-center gap-3.5">
            <h2 id="dem" className="m-0 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em]">
              Veja o Nota A com a sua regra de média.
            </h2>
            <p className="m-0 max-w-[440px] text-[18px] leading-[29px] text-amb-on-navy-muted">
              Na demonstração, usamos um exemplo da sua instituição para mostrar boletim e frequência funcionando.
              <Confirmar nota="é uma promessa comercial sobre o formato da demonstração" className="!bg-warning-tint" />
            </p>
          </div>
          <FormularioLead
            origem="demo"
            botao="Agendar demonstração"
            consentimento="Autorizo o Nota A a usar meu nome, instituição e e-mail para combinar a demonstração, como descrito na"
            sucesso={{ titulo: 'Pedido de demonstração recebido', texto: 'Entraremos em contato pelo e-mail informado para combinar a demonstração.' }}
            estilo={FORM_ESCOLA}
            campos={[
              { nome: 'nome', rotulo: 'Seu nome', tipo: 'text', autoComplete: 'name' },
              { nome: 'instituicao', rotulo: 'Instituição', tipo: 'text', autoComplete: 'organization' },
              { nome: 'email', rotulo: 'E-mail de trabalho', tipo: 'email', autoComplete: 'email' },
            ]}
          />
        </div>
      </section>

      <Rodape className="text-amb-ink-muted" classeDoLink="hover:text-amb-accent" />
    </>
  );
}
