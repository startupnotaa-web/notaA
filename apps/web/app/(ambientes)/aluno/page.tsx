import Link from 'next/link';
import { Cabecalho } from '../../_landing/componentes/Cabecalho';
import { PalcoAluno } from '../../_landing/componentes/Palcos';
import { Rodape } from '../../_landing/componentes/Rodape';
import { BOTAO_ALUNO } from '../../_landing/componentes/estilos';
import { FallbackAluno } from '../../_landing/fallbacks/FallbackAluno';
import { metadadosDaPagina } from '../../../lib/site';

export const metadata = metadadosDaPagina({
  titulo: 'Nota A para alunos: estude para o ENEM, um passo por dia',
  descricao:
    'Sessões curtas de estudo, simulados e uma nota estimada do ENEM. Crie sua conta no Nota A e siga a trilha no seu ritmo.',
  caminho: '/aluno',
  imagem: 'aluno',
});

const TITULO = 'font-pesada font-extrabold tracking-[-0.02em] text-[clamp(2rem,3.8vw,3.25rem)] leading-[1.1]';
const FLUTUANTE =
  'absolute rounded-[16px] bg-amb-ink px-4 py-3 font-text text-[15px] font-bold leading-5 text-amb-on-accent shadow-[0_8px_0_color-mix(in_srgb,var(--amb-bg-deep)_70%,transparent)]';

const PASSOS = [
  {
    cor: 'bg-amb-cyan',
    titulo: 'Descubra onde você está',
    texto: 'Um diagnóstico curto mostra o que você já domina e onde precisa focar.',
  },
  {
    cor: 'bg-amb-accent',
    titulo: 'Siga a trilha',
    texto: 'Sessões curtas de questões, em uma trilha de estudo montada para você.',
  },
  {
    cor: 'bg-amb-pink',
    titulo: 'Acompanhe sua nota',
    texto: 'A nota estimada se ajusta a cada simulado, e você vê quais áreas puxam a nota para cima ou para baixo.',
  },
];

const AREAS = [
  { nome: 'Linguagens', pct: 72, cor: 'bg-amb-cyan', largura: 'w-[72%]' },
  { nome: 'Ciências humanas', pct: 64, cor: 'bg-amb-pink', largura: 'w-[64%]' },
  { nome: 'Ciências da natureza', pct: 48, cor: 'bg-amb-sun', largura: 'w-[48%]' },
  { nome: 'Matemática', pct: 55, cor: 'bg-amb-accent', largura: 'w-[55%]' },
];

const JOGO = [
  { cor: 'bg-amb-cyan', titulo: 'Sequência de estudo', texto: 'Veja quantos dias seguidos você estudou e mantenha o ritmo sem pressão.' },
  { cor: 'bg-amb-accent', titulo: 'Pontos de experiência', texto: 'Cada sessão soma pontos de experiência (XP), e a barra mostra o quanto você avançou.' },
  { cor: 'bg-amb-pink', titulo: 'Conquistas', texto: 'Conquistas para colecionar ao longo do estudo.' },
  { cor: 'bg-amb-sun', titulo: 'Erros que viram aprendizado', texto: 'O Nota A separa o erro de quem ainda não aprendeu o conteúdo do erro de distração, para você saber o que revisar.' },
];

export default function Aluno() {
  return (
    <>
      <section className="relative bg-[radial-gradient(900px_600px_at_80%_20%,color-mix(in_srgb,var(--brand-violet)_55%,transparent),transparent_70%),radial-gradient(700px_500px_at_0%_0%,color-mix(in_srgb,var(--amb-cyan)_25%,transparent),transparent_70%)]">
        <Cabecalho
          selo={
            <span className="rounded-pill bg-amb-accent px-2.5 font-pesada text-[13px] font-extrabold leading-5 text-amb-on-accent">
              Aluno
            </span>
          }
          links={[
            { href: '#como', rotulo: 'Como funciona' },
            { href: '#nota', rotulo: 'Nota estimada' },
            { href: '#jogo', rotulo: 'Jogo e conquistas' },
          ]}
          secundario={{ href: '/', rotulo: 'Voltar ao Nota A' }}
          acao={
            <Link href="/cadastro" className={`${BOTAO_ALUNO.primario} ${BOTAO_ALUNO.compacto}`}>
              Criar minha conta
            </Link>
          }
          classeDoLink="hover:text-amb-accent"
          classeDoNome="font-pesada font-bold"
        />
        <main id="conteudo">
          <div className="mx-auto flex w-full max-w-landing flex-wrap items-center gap-4 px-5 pb-[72px] pt-4 md:px-10">
            <div className="flex min-w-0 flex-[1_1_500px] flex-col gap-[26px]">
              <span className="inline-flex animate-landing-pop self-start rounded-pill bg-[color:var(--amb-line)] px-4 py-1.5 font-text text-label font-bold [animation-delay:60ms]">
                Preparo para o ENEM
              </span>
              <h1 className="max-w-[640px] animate-landing-pop font-pesada text-[clamp(2.625rem,5.6vw,5rem)] font-extrabold leading-[1.04] tracking-[-0.03em] [animation-delay:140ms]">
                Um passo por dia até o ENEM.
              </h1>
              <p className="max-w-[500px] animate-landing-pop text-[20px] leading-8 text-amb-ink-muted [animation-delay:240ms]">
                Sessões curtas de estudo, simulados e uma nota estimada do ENEM que se atualiza a cada simulado.
              </p>
              <div className="flex animate-landing-pop flex-wrap gap-4 [animation-delay:340ms]">
                <Link href="/cadastro" className={BOTAO_ALUNO.primario}>
                  Criar minha conta
                </Link>
                <a href="#como" className={BOTAO_ALUNO.contorno}>
                  Ver como funciona
                </a>
              </div>
            </div>

            <PalcoAluno fallback={<FallbackAluno />} className="h-[420px] min-w-0 flex-[1_1_520px] md:h-[620px]">
              <span className={`${FLUTUANTE} left-[2%] top-[20%]`}>6 dias estudando</span>
              <span className={`${FLUTUANTE} right-[4%] top-[46%] !bg-amb-accent`}>+40 pontos de estudo</span>
              <span className={`${FLUTUANTE} bottom-[8%] left-[8%] flex flex-col gap-0.5`}>
                <span className="text-[13.5px] font-normal">Nota estimada</span>
                <strong className="font-pesada text-[28px] font-extrabold leading-8">
                  612 <span className="font-text text-body-sm font-normal">de 1.000</span>
                </strong>
              </span>
              <p className="absolute bottom-0 right-0 m-0 max-w-[220px] text-right text-caption text-amb-ink-muted">
                Ilustração com dados de exemplo.
              </p>
            </PalcoAluno>
          </div>
        </main>
      </section>

      <section id="como" aria-labelledby="com" className="mx-auto w-full max-w-landing px-5 pb-10 pt-[72px] md:px-10">
        <h2 id="com" className={`${TITULO} mb-9 max-w-[700px]`}>
          Três passos até a prova.
        </h2>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-6 p-0">
          {PASSOS.map((p, i) => (
            <li
              key={p.titulo}
              className="flex flex-col gap-3 rounded-[26px] border-2 border-[color:var(--amb-line)] bg-amb-bg-2 p-7 shadow-[0_8px_0_var(--amb-bg-deep)]"
            >
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-[14px] font-pesada text-[22px] font-extrabold leading-none text-amb-on-accent ${p.cor}`}>
                {i + 1}
              </span>
              <h3 className="m-0 font-pesada text-[24px] font-bold leading-[30px]">{p.titulo}</h3>
              <p className="m-0 text-[17px] leading-[27px] text-amb-ink-muted">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="nota" aria-labelledby="not" className="mx-auto flex w-full max-w-landing flex-wrap items-center gap-12 px-5 py-14 md:px-10">
        <div className="flex flex-[1_1_380px] flex-col gap-[18px]">
          <h2 id="not" className={TITULO}>
            Sua nota estimada, sem mistério.
          </h2>
          <p className="m-0 max-w-[460px] text-[19px] leading-[30px] text-amb-ink-muted">
            Você vê a nota estimada, a evolução entre os simulados e qual área do ENEM puxa a nota para cima ou para baixo.
          </p>
          <p className="m-0 max-w-[460px] text-body-sm text-amb-ink-muted">
            É uma estimativa e não substitui o resultado oficial do ENEM.
          </p>
        </div>
        <div className="flex flex-[1_1_480px] flex-col gap-6 rounded-[30px] border-2 border-[color:var(--amb-line)] bg-amb-bg-2 p-8 shadow-[0_10px_0_var(--amb-bg-deep)]">
          <p className="m-0 text-[16px] leading-6 text-amb-ink-muted">Exemplo de painel, com dados de exemplo</p>
          <div className="flex items-baseline gap-2.5">
            <span className="font-pesada text-[72px] font-extrabold leading-none tracking-[-0.03em]">612</span>
            <span className="text-[18px] text-amb-ink-muted">de 1.000</span>
          </div>
          <div role="img" aria-label="Nota estimada de exemplo: 612 de 1.000" className="h-[18px] overflow-hidden rounded-pill bg-[color:var(--amb-line)]">
            <div className="h-full w-[61.2%] rounded-pill bg-amb-accent" />
          </div>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {AREAS.map((a) => (
              <li key={a.nome} className="flex items-center gap-4">
                <span className="shrink-0 basis-[150px] font-bold sm:basis-[170px]">{a.nome}</span>
                <div role="img" aria-label={`${a.nome}: ${a.pct}% (exemplo)`} className="h-3.5 flex-1 overflow-hidden rounded-pill bg-[color:var(--amb-line)]">
                  <div className={`h-full rounded-pill ${a.cor} ${a.largura}`} />
                </div>
                <strong className="shrink-0 basis-12 text-right">{a.pct}%</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="jogo" aria-labelledby="jog" className="mx-auto w-full max-w-landing px-5 pb-10 pt-14 md:px-10">
        <h2 id="jog" className={`${TITULO} mb-9 max-w-[760px]`}>
          Estudar vira hábito quando tem jogo.
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 p-0">
          {JOGO.map((j) => (
            <li key={j.titulo} className={`flex flex-col gap-2.5 rounded-3xl p-[26px] text-amb-on-accent shadow-[0_8px_0_color-mix(in_srgb,var(--amb-bg-deep)_75%,transparent)] ${j.cor}`}>
              <h3 className="m-0 font-pesada text-[24px] font-bold leading-[30px]">{j.titulo}</h3>
              <p className="m-0 text-[17px] leading-[27px]">{j.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-landing px-5 pb-14 pt-10 md:px-10">
        <div className="flex flex-wrap items-center gap-x-12 gap-y-6 rounded-[28px] border-2 border-[color:var(--amb-line)] bg-[color:var(--amb-line)] px-6 py-9 md:px-10">
          <h2 className="m-0 flex-[1_1_340px] font-pesada text-[28px] font-bold leading-9">Errou? A IA guia você até entender.</h2>
          <p className="m-0 flex-[1_1_420px] text-[18px] leading-[29px] text-amb-ink-muted">
            O tutor faz perguntas para você chegar ao raciocínio, em linguagem simples. A nota do simulado é sempre calculada por regra, nunca pela IA.
          </p>
        </div>
      </section>

      <section id="comecar" aria-labelledby="cta" className="mx-auto w-full max-w-landing px-5 pb-20 pt-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[36px] bg-amb-accent p-8 text-amb-on-accent shadow-[0_12px_0_var(--amb-accent-edge)] md:p-14">
          <div className="flex flex-[1_1_380px] flex-col gap-3">
            <h2 id="cta" className="m-0 font-pesada text-[clamp(2.125rem,4vw,3.5rem)] font-extrabold leading-[1.06] tracking-[-0.02em]">
              Comece hoje o seu primeiro passo.
            </h2>
            <p className="m-0 max-w-[460px] text-[18px] leading-[29px]">
              Se você tem menos de 18 anos, dados sensíveis só são coletados com a autorização do seu responsável.
            </p>
          </div>
          <Link href="/cadastro" className={BOTAO_ALUNO.escuro}>
            Criar minha conta
          </Link>
        </div>
      </section>

      <Rodape className="text-amb-ink-muted" classeDoLink="hover:text-amb-accent" />
    </>
  );
}
