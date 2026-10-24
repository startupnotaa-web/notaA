import Link from 'next/link';
import { Cabecalho } from '../../_landing/componentes/Cabecalho';
import { PalcoProfessores } from '../../_landing/componentes/Palcos';
import { Rodape } from '../../_landing/componentes/Rodape';
import { BOTAO_PROFESSOR } from '../../_landing/componentes/estilos';
import { FallbackProfessores } from '../../_landing/fallbacks/FallbackProfessores';
import { metadadosDaPagina } from '../../../lib/site';

export const metadata = metadadosDaPagina({
  titulo: 'Nota A para professores: turmas e alunos em um painel só',
  descricao:
    'Para quem dá aula por conta própria: organize turmas e acompanhe cada aluno em um painel só, sem planilha solta.',
  caminho: '/professores',
  imagem: 'professores',
});

const H2 = 'font-display text-[clamp(1.875rem,3.4vw,2.75rem)] font-semibold leading-[1.14] tracking-[-0.02em] text-amb-accent-hover';

const RECURSOS: { titulo: string; texto: string }[] = [
  {
    titulo: 'Turmas e alunos',
    texto: 'Cadastre turmas e importe a lista de alunos da planilha que você já tem.',
  },
  {
    titulo: 'Presença em poucos toques',
    texto: 'Marque quem veio e quem faltou. O percentual de frequência se atualiza sozinho.',
  },
  {
    titulo: 'Notas com a sua regra',
    texto: 'Você define pesos e média de aprovação. O cálculo segue a regra, sempre igual.',
  },
];

export default function Professores() {
  return (
    <>
      <section className="relative border-b border-amb-line bg-[linear-gradient(180deg,var(--amb-surface),var(--amb-bg))]">
        <Cabecalho
          selo={
            <span className="rounded-sm bg-amb-accent px-2.5 font-text text-[13px] font-bold leading-5 text-amb-on-accent">
              Professor
            </span>
          }
          links={[
            { href: '#recursos', rotulo: 'Recursos' },
            { href: '#antes', rotulo: 'Antes e depois' },
          ]}
          secundario={{ href: '/', rotulo: 'Voltar ao Nota A' }}
          acao={
            <Link href="/cadastro" className={`${BOTAO_PROFESSOR.primario} ${BOTAO_PROFESSOR.compacto}`}>
              Criar meu painel
            </Link>
          }
          classeDoLink="text-amb-ink hover:text-amb-accent hover:underline hover:underline-offset-[5px]"
        />
        <main id="conteudo">
          <div className="mx-auto flex w-full max-w-landing flex-wrap items-center gap-4 px-5 pb-[72px] pt-6 md:px-10">
            <div className="flex min-w-0 flex-[1_1_500px] flex-col gap-[26px]">
              <h1 className="max-w-[640px] animate-landing-rise font-display text-[clamp(2.5rem,5vw,4.375rem)] font-semibold leading-[1.07] tracking-[-0.03em] text-amb-accent-hover [animation-delay:80ms]">
                Você dá a aula. O painel cuida do resto.
              </h1>
              <p className="max-w-[520px] animate-landing-rise text-[20px] leading-8 text-amb-ink-muted [animation-delay:200ms]">
                Turmas, alunos e o acompanhamento de cada um em um painel só, sem planilha solta.
              </p>
              <div className="flex animate-landing-rise flex-wrap gap-3.5 [animation-delay:320ms]">
                <Link href="/cadastro" className={BOTAO_PROFESSOR.primario}>
                  Criar meu painel
                </Link>
                <a href="#recursos" className={BOTAO_PROFESSOR.contorno}>
                  Ver o que ele faz
                </a>
              </div>
            </div>
            <PalcoProfessores fallback={<FallbackProfessores />} className="h-[380px] min-w-0 flex-[1_1_520px] md:h-[620px]">
              <p className="absolute bottom-0 right-0 m-0 max-w-[220px] text-right text-caption text-amb-ink-muted">
                Ilustração com dados de exemplo.
              </p>
            </PalcoProfessores>
          </div>
        </main>
      </section>

      <section id="recursos" aria-labelledby="rec" className="mx-auto w-full max-w-landing px-5 pb-6 pt-20 md:px-10">
        <h2 id="rec" className={`${H2} mb-8 max-w-[680px]`}>
          Tudo o que a sua rotina de aula pede.
        </h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 p-0">
          {RECURSOS.map((r) => (
            <li key={r.titulo} className="flex flex-col gap-2.5 rounded-[14px] border border-amb-line bg-amb-surface p-[26px]">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-md bg-amb-accent">
                <i className="block h-4 w-4 rounded-[4px] bg-amb-amber" />
              </span>
              <h3 className="m-0 font-display text-[21px] font-semibold leading-7">
                {r.titulo}
              </h3>
              <p className="m-0 text-[16.5px] leading-[26px] text-amb-ink-muted">{r.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="antes" aria-labelledby="ant" className="mx-auto w-full max-w-landing px-5 pb-6 pt-[72px] md:px-10">
        <h2 id="ant" className={`${H2} mb-8`}>
          Antes e depois.
        </h2>
        <div className="flex flex-wrap overflow-hidden rounded-lg border border-amb-line bg-amb-surface">
          <div className="flex flex-[1_1_380px] flex-col gap-3 p-8">
            <h3 className="m-0 font-display text-[20px] font-semibold leading-[26px] text-amb-ink-muted">Hoje</h3>
            <p className="m-0 text-[17px] leading-[27px] text-amb-ink-muted">
              Se as notas estão numa planilha, a presença no caderno e os recados em grupos de mensagens, cada coisa mora em um lugar.
            </p>
          </div>
          <div className="flex flex-[1_1_380px] flex-col gap-3 bg-amb-accent p-8 text-amb-on-accent">
            <h3 className="m-0 font-display text-[20px] font-semibold leading-[26px]">
              Com o Nota A
            </h3>
            <p className="m-0 text-[17px] leading-[27px]">
              Um cadastro por turma, presença e notas no mesmo lugar.
            </p>
          </div>
        </div>
      </section>

      <section id="criar" aria-labelledby="cri" className="mx-auto w-full max-w-landing px-5 pb-20 pt-[72px] md:px-10">
        <div className="flex flex-wrap items-center gap-10 rounded-[20px] border border-amb-line bg-amb-surface p-8 md:p-12">
          <div className="flex flex-[1_1_360px] flex-col gap-3.5">
            <span aria-hidden="true" className="block h-1.5 w-16 rounded-pill bg-amb-amber" />
            <h2 id="cri" className="m-0 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-amb-accent-hover">
              Crie o seu painel de professor.
            </h2>
          </div>
          <Link href="/cadastro" className={BOTAO_PROFESSOR.primario}>
            Criar meu painel
          </Link>
        </div>
      </section>

      <Rodape className="text-amb-ink-muted" classeDoLink="hover:text-amb-accent" />
    </>
  );
}
