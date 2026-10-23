import Link from 'next/link';
import { Aurora } from '@notaa/ui';
import { Cabecalho } from '../_landing/componentes/Cabecalho';
import { FormularioLead } from '../_landing/componentes/FormularioLead';
import { Placeholder } from '../_landing/componentes/Marcador';
import { PalcoHome } from '../_landing/componentes/Palcos';
import { Rodape } from '../_landing/componentes/Rodape';
import { BOTAO_HOME, FOCO, FORM_HOME } from '../_landing/componentes/estilos';
import { FallbackHome } from '../_landing/fallbacks/FallbackHome';
import { metadadosDaPagina } from '../../lib/site';

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição: um HTML do build não teria nonce.
export const dynamic = 'force-dynamic';

export const metadata = metadadosDaPagina({
  titulo: 'Nota A: um ambiente para cada papel',
  descricao:
    'O Nota A reúne o aluno que se prepara para o ENEM, o professor, a escola e, em breve, a faculdade. Um ambiente para cada papel, todos com a mesma base.',
  caminho: '/',
  imagem: 'home',
});

const AMBIENTES = [
  {
    id: 'aluno',
    href: '/aluno',
    nome: 'Aluno',
    sub: 'ENEM, no seu ritmo',
    posicao: 'md:left-[50%] md:top-[84%]',
    chip: 'Para quem estuda para o ENEM',
    texto: 'Trilha de estudo, simulados e uma nota estimada do ENEM.',
    ir: 'Conhecer o ambiente do aluno',
    glifo:
      'rounded-full bg-[conic-gradient(from_200deg,var(--amb-accent),var(--amb-cyan),var(--amb-pink),var(--amb-accent))] opacity-75',
  },
  {
    id: 'professor',
    href: '/professores',
    nome: 'Professor',
    sub: 'Suas aulas, seu painel',
    posicao: 'md:left-[80%] md:top-[52%]',
    chip: 'Para quem dá aula por conta própria',
    texto: 'Turmas, alunos e o acompanhamento de cada um em um painel só.',
    ir: 'Conhecer o ambiente do professor',
    glifo: 'flex items-end gap-2.5',
  },
  {
    id: 'escola',
    href: '/escola',
    nome: 'Escola',
    sub: 'Gestão acadêmica',
    posicao: 'md:left-[50%] md:top-[14%]',
    chip: 'Para instituições de ensino',
    texto: 'Boletim com a regra de média da sua instituição, frequência e importação das planilhas da secretaria.',
    ir: 'Conhecer o ambiente da escola',
    glifo: 'grid grid-cols-2 gap-2.5',
  },
  {
    id: 'faculdade',
    href: '/faculdade',
    nome: 'Faculdade',
    sub: 'ENADE, em breve',
    posicao: 'md:left-[20%] md:top-[52%]',
    chip: 'Em breve, para o ENADE',
    texto: 'Simulados e acompanhamento por curso, com relatório para a coordenação.',
    ir: 'Ver o que está por vir',
    glifo: 'rotate-45 rounded-[12px] border-[3px] border-[color:color-mix(in_srgb,var(--surface)_50%,transparent)] !h-[90px] !w-[90px] !bottom-3 !right-3',
  },
] as const;

const IGUAL_EM_TODOS = [
  {
    titulo: 'Média e situação por regra, não por IA',
    texto:
      'Médias, frequência e situação do aluno seguem regras fixas que dá para conferir. A IA ajuda a explicar um erro ou sugerir um estudo, e não decide média nem situação.',
  },
  {
    titulo: 'Feito para todo mundo ler',
    texto:
      'Letra desenhada para leitura, contraste alto, navegação por teclado e movimento que respeita a preferência do seu sistema.',
  },
  {
    titulo: 'Cada pessoa vê só o que é seu',
    texto:
      'O acesso segue o papel: aluno, responsável, professor e instituição veem só o que o papel permite. Dados sensíveis de menores de 18 anos só são coletados com a autorização do responsável.',
  },
];

function Glifo({ id, classe }: { id: string; classe: string }) {
  const base = 'pointer-events-none absolute bottom-0 right-0 h-[130px] w-[130px]';
  if (id === 'professor') {
    return (
      <span aria-hidden="true" className={`${base} ${classe}`}>
        <i className="h-1/2 flex-1 rounded-md bg-amb-amber" />
        <i className="h-4/5 flex-1 rounded-md bg-[color-mix(in_srgb,var(--surface)_55%,transparent)]" />
        <i className="h-[65%] flex-1 rounded-md bg-[color-mix(in_srgb,var(--surface)_30%,transparent)]" />
      </span>
    );
  }
  if (id === 'escola') {
    return (
      <span aria-hidden="true" className={`${base} ${classe}`}>
        <i className="rounded-sm bg-[color-mix(in_srgb,var(--surface)_55%,transparent)]" />
        <i className="rounded-sm bg-[color-mix(in_srgb,var(--surface)_25%,transparent)]" />
        <i className="rounded-sm bg-[color-mix(in_srgb,var(--surface)_25%,transparent)]" />
        <i className="rounded-sm bg-amb-glyph" />
      </span>
    );
  }
  return <span aria-hidden="true" className={`${base} ${classe}`} />;
}

export default function Home() {
  return (
    <div data-theme="light" className="min-h-screen overflow-x-clip bg-paper font-text text-ink">
      <Aurora as="section">
        <Cabecalho
          links={[
            { href: '#ambientes', rotulo: 'Ambientes' },
            { href: '#base', rotulo: 'O que é igual em todos' },
            { href: '#contato', rotulo: 'Contato' },
          ]}
          secundario={{ href: '/login', rotulo: 'Entrar' }}
          acao={
            <a href="#contato" className={`${BOTAO_HOME.primario} ${BOTAO_HOME.compacto}`}>
              Agendar demonstração
            </a>
          }
        />

        <main id="conteudo">
          <div className="relative mx-auto flex w-full max-w-landing flex-wrap items-center gap-6 px-5 pb-16 pt-6 md:px-10">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
              <h1 className="max-w-[700px] animate-landing-rise font-display text-[clamp(2.625rem,5.6vw,4.875rem)] font-semibold leading-[1.06] tracking-[-0.03em] [animation-delay:80ms]">
                Um só caminho, de quem estuda a quem ensina.
              </h1>
              <p className="max-w-[540px] animate-landing-rise text-[20px] leading-8 text-ink-muted [animation-delay:220ms]">
                O Nota A tem um ambiente para cada papel: o aluno que se prepara para o ENEM, o professor que cuida das
                próprias aulas, a escola e, em breve, a faculdade. Cada um com o seu jeito, todos com a mesma base.
              </p>
              <div className="flex animate-landing-rise flex-wrap gap-3.5 [animation-delay:360ms]">
                <a href="#ambientes" className={BOTAO_HOME.primario}>
                  Escolher meu ambiente
                </a>
                <a href="#contato" className={BOTAO_HOME.secundario}>
                  Falar com a gente
                </a>
              </div>
            </div>

            <PalcoHome
              fallback={<FallbackHome />}
              className="min-w-0 flex-[1_1_560px] md:h-[640px]"
              classeDaArte="inset-x-0 top-0 h-[340px] md:inset-0 md:h-auto"
            >
              <div className="h-[340px] md:hidden" />
              <ul className="relative m-0 grid list-none grid-cols-2 gap-3 p-0 md:absolute md:inset-0 md:block">
                {AMBIENTES.map((a) => (
                  <li key={a.id} className="contents">
                    <Link
                      href={a.href}
                      data-ancora
                      data-ambiente={a.id}
                      className={`flex w-full flex-col gap-0.5 rounded-[18px] bg-amb-tag px-[18px] py-3.5 text-surface no-underline shadow-raise md:absolute md:w-[172px] md:-translate-x-1/2 md:-translate-y-1/2 ${a.posicao} ${FOCO}`}
                    >
                      <strong className="font-display text-[20px] font-semibold leading-[26px]">{a.nome}</strong>
                      <span className="text-body-sm">{a.sub}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </PalcoHome>
          </div>
        </main>
      </Aurora>

      <section id="ambientes" aria-labelledby="amb" className="mx-auto w-full max-w-landing px-5 pb-6 pt-[72px] md:px-10">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <h2
            id="amb"
            className="max-w-[640px] font-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.12] tracking-[-0.02em]"
          >
            Escolha o ambiente que combina com o seu dia.
          </h2>
          <p className="max-w-[420px] text-[18px] leading-[29px] text-ink-muted">
            Cada um tem cores, ritmo e telas próprias, pensadas para quem usa.
          </p>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-5 p-0">
          {AMBIENTES.map((a) => (
            <li key={a.id} className="contents">
              <Link
                href={a.href}
                data-ambiente={a.id}
                className={`group relative flex min-h-[430px] flex-col gap-3.5 overflow-hidden rounded-[26px] bg-[linear-gradient(160deg,var(--amb-card-from),var(--amb-card-to))] px-7 py-[30px] text-surface no-underline transition-[transform,box-shadow] duration-base ease-out hover:-translate-y-2 hover:shadow-raise motion-reduce:transition-none ${FOCO}`}
              >
                <span className="inline-flex self-start rounded-pill bg-[color-mix(in_srgb,var(--amb-card-to)_55%,transparent)] px-3 py-1 text-[13.5px] font-bold leading-5">
                  {a.chip}
                </span>
                <h3 className="m-0 font-display text-[34px] font-semibold leading-10 tracking-[-0.01em]">{a.nome}</h3>
                <p className="m-0 max-w-[300px] text-[17px] leading-[27px]">{a.texto}</p>
                {/* A arte ocupa o espaço entre o texto e a chamada, sem passar por baixo do texto. */}
                <div className="relative min-h-[130px] flex-1">
                  <Glifo id={a.id} classe={a.glifo} />
                </div>
                <span className="text-body font-bold underline underline-offset-[5px]">{a.ir}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="base" aria-labelledby="bas" className="mx-auto w-full max-w-landing px-5 pb-6 pt-[88px] md:px-10">
        <h2
          id="bas"
          className="mb-10 max-w-[700px] font-display text-[clamp(1.875rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.02em]"
        >
          O que é igual nos quatro ambientes.
        </h2>
        <div className="flex flex-wrap border-t border-line">
          {IGUAL_EM_TODOS.map((item, i) => (
            <div
              key={item.titulo}
              className={`flex-[1_1_320px] py-8 ${i === 0 ? 'pr-9' : 'border-line lg:border-l lg:px-9'} ${i === 2 ? 'lg:pr-0' : ''}`}
            >
              <h3 className="mb-2.5 font-display text-heading-2 font-semibold">{item.titulo}</h3>
              <p className="max-w-[380px] text-[17px] leading-7 text-ink-muted">{item.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contato" aria-labelledby="con" className="mx-auto w-full max-w-landing px-5 pb-20 pt-[72px] md:px-10">
        {/* O degradê da marca entra como luz de fundo, e o texto fica sobre o índigo sólido: branco sobre o ciano do
            degradê não chegaria a 4,5:1. */}
        <div className="relative isolate flex flex-wrap gap-10 overflow-hidden rounded-[32px] bg-ink p-6 text-surface md:p-14">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-32 -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,var(--brand-cyan),transparent_68%)] opacity-60 blur-[60px]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -right-20 -z-10 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,var(--brand-magenta),transparent_68%)] opacity-50 blur-[60px]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/3 top-1/2 -z-10 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,var(--brand-violet),transparent_68%)] opacity-60 blur-[60px]"
          />
          <div className="flex flex-[1_1_380px] flex-col justify-center gap-4">
            <h2
              id="con"
              className="m-0 font-display text-[clamp(2rem,3.6vw,2.875rem)] font-semibold leading-[1.12] tracking-[-0.02em]"
            >
              Conte quem você é e indicamos o caminho.
            </h2>
            <p className="m-0 max-w-[440px] text-[18px] leading-[29px]">
              Respondemos por e-mail com o ambiente certo para você e os próximos passos.{' '}
              <Placeholder nota="canal e prazo de resposta" />
            </p>
          </div>
          <FormularioLead
            origem="contato"
            botao="Quero conhecer"
            consentimento="Autorizo o Nota A a usar meu nome e e-mail para responder a este pedido, como descrito na"
            sucesso={{
              titulo: 'Pedido recebido',
              texto: 'Vamos responder por e-mail com o ambiente indicado para você.',
            }}
            estilo={FORM_HOME}
            campos={[
              { nome: 'nome', rotulo: 'Seu nome', tipo: 'text', autoComplete: 'name' },
              { nome: 'email', rotulo: 'Seu e-mail', tipo: 'email', autoComplete: 'email' },
              {
                nome: 'perfil',
                rotulo: 'Eu sou',
                tipo: 'select',
                opcoes: [
                  { valor: 'aluno', rotulo: 'Aluno que estuda para o ENEM' },
                  { valor: 'professor', rotulo: 'Professor com aulas próprias' },
                  { valor: 'gestor', rotulo: 'Gestor de escola ou instituição' },
                  { valor: 'faculdade', rotulo: 'Da faculdade, quero a lista de espera' },
                ],
              },
            ]}
          />
        </div>
      </section>

      <Rodape className="text-ink-muted" />
    </div>
  );
}
