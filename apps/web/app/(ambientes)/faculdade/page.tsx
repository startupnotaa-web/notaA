import { Cabecalho } from '../../_landing/componentes/Cabecalho';
import { FormularioLead } from '../../_landing/componentes/FormularioLead';
import { PalcoFaculdade } from '../../_landing/componentes/Palcos';
import { Rodape } from '../../_landing/componentes/Rodape';
import { BOTAO_FACULDADE, FOCO, FORM_FACULDADE } from '../../_landing/componentes/estilos';
import { FallbackFaculdade } from '../../_landing/fallbacks/FallbackFaculdade';
import { metadadosDaPagina } from '../../../lib/site';

export const metadata = metadadosDaPagina({
  titulo: 'Nota A para faculdades: o módulo ENADE, em breve',
  descricao:
    'O módulo Faculdade do Nota A vai reunir simulados no formato do exame, diagnóstico por curso e relatórios para a coordenação. Entre na lista de espera.',
  caminho: '/faculdade',
  imagem: 'faculdade',
});

const H2 = 'font-serifa text-[clamp(2.125rem,4vw,3.375rem)] font-medium leading-[1.1] tracking-[-0.01em]';
const SERIFA = 'font-serifa';

const PLANEJADO = [
  { titulo: 'Simulados no formato do exame', texto: 'Questões de formação geral e de componente específico, organizadas como na prova, com tempo e relatório ao final.' },
  { titulo: 'Diagnóstico por curso', texto: 'Um retrato do desempenho do estudante por área de conhecimento, para orientar o estudo antes da prova.' },
  { titulo: 'Relatório para a coordenação', texto: 'Desempenho por turma e por área, para a coordenação decidir onde reforçar o ensino.' },
  { titulo: 'Acompanhamento ao longo do curso', texto: 'O estudante vê a evolução semestre a semestre, em vez de descobrir tudo perto do exame.' },
];

const ETAPAS = [
  { titulo: 'Descoberta', texto: 'Entrevistas com coordenadores de curso.' },
  { titulo: 'Piloto', texto: 'Um curso usa o módulo e nos ajuda a ajustar.' },
  { titulo: 'Lançamento', texto: 'Abertura para novas faculdades.' },
];

export default function Faculdade() {
  const resumo = `${SERIFA} cursor-pointer list-none items-center justify-between gap-4 py-5 text-[22px] font-medium leading-[30px] [&::-webkit-details-marker]:hidden ${FOCO}`;
  return (
    <>
      <section className="border-b border-amb-line">
        <Cabecalho
          selo={
            <span className="rounded-[3px] border border-amb-accent px-2.5 font-text text-[13px] font-bold leading-5 text-amb-accent">
              Faculdade
            </span>
          }
          links={[
            { href: '#modulo', rotulo: 'O módulo' },
            { href: '#etapas', rotulo: 'Etapas' },
            { href: '#duvidas', rotulo: 'Dúvidas' },
          ]}
          secundario={{ href: '/', rotulo: 'Voltar ao Nota A' }}
          acao={
            <a href="#espera" className={`${BOTAO_FACULDADE.primario} ${BOTAO_FACULDADE.compacto}`}>
              Entrar na lista de espera
            </a>
          }
          classeDoLink="rounded-[4px] hover:text-amb-accent hover:underline hover:underline-offset-[5px]"
        />
        <main id="conteudo">
          <div className="mx-auto flex w-full max-w-landing flex-wrap items-center gap-4 px-5 pb-20 pt-6 md:px-10">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
              <span className="inline-flex animate-landing-fade self-start rounded-[3px] border border-amb-accent px-2.5 py-0.5 font-text text-[13px] font-bold leading-5 text-amb-accent">
                Em breve
              </span>
              <h1 className="max-w-[700px] animate-landing-fade font-serifa text-[clamp(2.75rem,5.6vw,5rem)] font-medium leading-[1.04] tracking-[-0.02em] [animation-delay:120ms]">
                ENADE com método e evidência.
              </h1>
              <div className="flex animate-landing-fade flex-wrap gap-3.5 [animation-delay:400ms]">
                <a href="#espera" className={BOTAO_FACULDADE.primario}>
                  Entrar na lista de espera
                </a>
                <a href="#modulo" className={BOTAO_FACULDADE.contorno}>
                  Ver o que está planejado
                </a>
              </div>
            </div>
            <PalcoFaculdade fallback={<FallbackFaculdade />} className="h-[340px] min-w-0 flex-[1_1_460px] md:h-[560px]" />
          </div>
        </main>
      </section>

      <section id="modulo" aria-labelledby="mod" className="mx-auto w-full max-w-landing px-5 pb-6 pt-[88px] md:px-10">
        <h2 id="mod" className={`${H2} mb-10 max-w-[760px]`}>
          O que está planejado para o módulo.
        </h2>
        <ul className="m-0 list-none p-0">
          {PLANEJADO.map((p, i) => (
            <li key={p.titulo} className={`flex flex-wrap gap-x-10 gap-y-3 border-t border-amb-line py-8 ${i === PLANEJADO.length - 1 ? 'border-b' : ''}`}>
              <h3 className="m-0 flex-[0_0_300px] font-serifa text-[28px] font-medium leading-[34px]">{p.titulo}</h3>
              <p className="m-0 max-w-[560px] flex-[1_1_380px] text-[18px] leading-[30px] text-amb-ink-muted">{p.texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[620px] text-[15.5px] leading-[25px] text-amb-ink-muted">
          Tudo aqui é planejamento. Escopo e prazos podem mudar conforme conversamos com as coordenações de curso.
        </p>
      </section>

      <section id="etapas" aria-labelledby="eta" className="mx-auto w-full max-w-landing px-5 pb-6 pt-20 md:px-10">
        <h2 id="eta" className={`${H2} mb-8`}>
          Etapas do caminho.
        </h2>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(280px,1fr))] border-t-2 border-amb-ink p-0">
          {ETAPAS.map((e, i) => (
            <li key={e.titulo} className={`pb-2 pt-6 ${i === 0 ? 'pr-7' : i === ETAPAS.length - 1 ? 'md:pl-7' : 'md:px-7'}`}>
              <div className="font-serifa text-[40px] font-medium leading-[44px] text-amb-accent">{i + 1}</div>
              <h3 className="mb-2 mt-1.5 font-serifa text-[24px] font-medium leading-[30px]">{e.titulo}</h3>
              <p className="m-0 text-[17px] leading-[27px] text-amb-ink-muted">
                {e.texto}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section id="duvidas" aria-labelledby="duv" className="mx-auto w-full max-w-landing px-5 pb-6 pt-20 md:px-10">
        <h2 id="duv" className={`${H2} mb-8`}>
          Perguntas frequentes.
        </h2>
        <div className="border-b border-amb-line">
          {[
            {
              p: 'O que é o ENADE?',
              r: (
                <>O Exame Nacional de Desempenho dos Estudantes avalia o desempenho de estudantes de graduação e faz parte do sistema nacional de avaliação da educação superior.</>
              ),
            },
            {
              p: 'Quando o módulo chega?',
              r: (
                <>
                  Ainda não temos data.
                </>
              ),
            },
            {
              p: 'Minha faculdade pode participar do piloto?',
              r: (
                <>
                  Deixe seus dados na lista de espera e conte qual curso tem interesse.
                </>
              ),
            },
            {
              p: 'O Nota A para aluno do ENEM serve para o ENADE?',
              r: <>Não. São exames diferentes, com conteúdo e formato próprios. Por isso o módulo Faculdade é um ambiente separado.</>,
            },
          ].map((d) => (
            <details key={d.p} className="group border-t border-amb-line">
              <summary className={`flex ${resumo}`}>
                {d.p}
                <span aria-hidden="true" className="font-text text-[26px] leading-[30px] text-amb-accent">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="mb-5 mt-0 max-w-[720px] text-[17.5px] leading-[29px] text-amb-ink-muted">{d.r}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="espera" aria-labelledby="esp" className="mx-auto w-full max-w-landing px-5 pb-20 pt-[72px] md:px-10">
        <div className="flex flex-wrap gap-10 bg-amb-ink p-6 text-amb-on-ink [--amb-focus:var(--amb-on-ink)] md:p-12">
          <div className="flex flex-[1_1_360px] flex-col justify-center gap-3.5">
            <h2 id="esp" className="m-0 font-serifa text-[clamp(2rem,3.6vw,2.875rem)] font-medium leading-[1.1]">
              Entre na lista de espera.
            </h2>
            <p className="m-0 max-w-[440px] text-[18px] leading-[29px] text-amb-on-ink-muted">
              Avisamos quando o piloto abrir e convidamos a coordenação do curso para conversar. Ainda não há data de abertura.
            </p>
          </div>
          <FormularioLead
            origem="espera"
            botao="Entrar na lista"
            consentimento="Autorizo o Nota A a usar meu nome, faculdade e e-mail para me avisar sobre o módulo Faculdade, como descrito na"
            sucesso={{ titulo: 'Você entrou na lista', texto: 'Avisaremos pelo e-mail informado quando houver novidade. Ainda não há data de abertura.' }}
            estilo={FORM_FACULDADE}
            campos={[
              { nome: 'nome', rotulo: 'Seu nome', tipo: 'text', autoComplete: 'name' },
              { nome: 'faculdadeCurso', rotulo: 'Faculdade e curso', tipo: 'text' },
              { nome: 'email', rotulo: 'E-mail institucional', tipo: 'email', autoComplete: 'email' },
            ]}
          />
        </div>
      </section>

      <Rodape className="text-amb-ink-muted" classeDoLink="hover:text-amb-accent" />
    </>
  );
}
