import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Building2, ChartNoAxesColumn, Sun } from 'lucide-react';
import { Cabecalho } from '../_landing/componentes/Cabecalho';
import { FormularioLead } from '../_landing/componentes/FormularioLead';
import { NotaASimbolo } from '@notaa/ui';
import { DADOS_JURIDICOS, juridicoCompleto } from '../../lib/publico/juridico';
import { BOTAO_HOME, FOCO, FORM_HOME } from '../_landing/componentes/estilos';
import { metadadosDaPagina } from '../../lib/publico/site';
import { ArteHome } from './ArteHome';
import { MapaHome } from './MapaHome';
import styles from './home.module.css';
import { CartoesHome } from './CartoesHome';

// A CSP com nonce exige HTML gerado por requisição.
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
    href: '/aluno',
    nome: 'Aluno',
    texto: 'Aprenda mais, vá mais longe.',
    Icone: ArrowUpRight,
    corCaderno: 'Azul',
    descricao: 'Monte sua trilha de estudos, faça simulados e acompanhe sua nota estimada do ENEM.',
  },
  {
    href: '/professores',
    nome: 'Professor',
    texto: 'Ensine com mais apoio.',
    Icone: Sun,
    corCaderno: 'Amarelo',
    descricao: 'Organize suas aulas e turmas e acompanhe o progresso dos alunos em um painel.',
  },
  {
    href: '/escola',
    nome: 'Escola',
    texto: 'Organize e evolua sua instituição.',
    Icone: Building2,
    corCaderno: 'Branco',
    descricao: 'Gerencie boletins e frequência e importe as planilhas da secretaria.',
  },
  {
    href: '/faculdade',
    nome: 'Faculdade',
    texto: 'Em breve, preparação para o ENADE.',
    Icone: ChartNoAxesColumn,
    corCaderno: 'Rosa',
    descricao:
      'Conheça o ambiente em preparação para o ENADE e veja como entrar na lista de espera.',
  },
];

const LARGURA = 'mx-auto w-full max-w-landing px-5 md:px-10';
const TITULO = 'font-display text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.08] tracking-tight';

export default function Home() {
  return (
    <div data-theme="light" className="min-h-screen overflow-x-clip bg-paper font-text text-ink">
      <div className={styles.homeIntro} aria-hidden="true">
        <svg className={styles.homeIntroRibbon} viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path
            d="M-75 -140C-41 65 22 523 135 542C251 560 229 71 355 77C478 83 410 820 523 900C650 988 638 409 773 425C884 438 866 968 1010 1125"
            pathLength="1"
          />
        </svg>
        <div className={styles.homeIntroMark}>
          <NotaASimbolo className="h-auto w-full" />
        </div>
      </div>
      <div className="bg-[radial-gradient(ellipse_at_top_right,var(--violet-tint),transparent_75%)]">
        <Cabecalho
          links={[
            { href: '#ambientes', rotulo: 'Soluções' },
            { href: '#sobre', rotulo: 'Sobre' },
            { href: '#base', rotulo: 'Plataforma' },
            { href: '#contato', rotulo: 'Contato' },
          ]}
          secundario={{ href: '/login', rotulo: 'Entrar' }}
          acao={
            <a href="#contato" className={`${BOTAO_HOME.primario} ${BOTAO_HOME.compacto}`}>
              Agendar demonstração
            </a>
          }
        />
        <main id="conteudo" tabIndex={-1}>
          <section
            id="sobre"
            className={`${LARGURA} grid items-center gap-8 pb-16 pt-12 md:grid-cols-[1fr_1.06fr] lg:pb-24 lg:pt-20`}
          >
            <div className={styles.heroIntroCopy}>
              <h1 className="max-w-[10em] font-display text-[clamp(2.25rem,5.3vw,5.25rem)] font-extrabold leading-[1.04] tracking-[-0.055em]">
                <span>Educação</span> <span>não</span> <span>deveria</span> <span>caber</span>{' '}
                <span>em</span> <span className="text-primary">uma caixa.</span>
              </h1>
              <p className="mt-6 max-w-[37ch] text-lead text-ink-muted">
                A Nota A conecta alunos, professores e instituições em uma plataforma para estudar,
                ensinar e acompanhar a aprendizagem.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#ambientes" className={`${BOTAO_HOME.primario} gap-2`}>
                  Descubra seu ambiente <ArrowDown size={18} aria-hidden="true" />
                </a>
                <Link href="/cadastro" className={BOTAO_HOME.secundario}>
                  Criar conta
                </Link>
              </div>
            </div>
            <div className={styles.heroIntroArt}>
              <ArteHome />
            </div>
          </section>

          <section aria-labelledby="manifesto" className={styles.ribbonSection}>
            <svg
              className={styles.scrollRibbon}
              viewBox="0 0 1440 600"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="home-scroll-ribbon" x1="0%" y1="0%" x2="100%" y2="76%">
                  <stop stopColor="var(--primary-hover)" />
                  <stop offset=".52" stopColor="var(--brand-blue)" />
                  <stop offset="1" stopColor="var(--brand-blue)" />
                </linearGradient>
              </defs>
              <path
                d="M-110 122C61 104 257 9 388 67C491 113 521 196 483 290C415 452 259 519 144 474C35 431 68 308 198 245C348 169 621 176 822 265C962 326 1027 443 1130 451C1235 459 1328 369 1420 422C1470 451 1512 468 1570 447"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className={`${LARGURA} ${styles.ribbonContent}`}>
              <h2 id="manifesto" className={TITULO}>
                De quem aprende
                <br />
                <span className="text-primary">para quem ensina</span>
                <br />e quem transforma.
              </h2>
              <p className="border-l border-primary pl-5 text-lead text-ink-muted">
                Cada ambiente reúne as ferramentas de que você precisa no dia a dia.
              </p>
            </div>
          </section>

          <section id="ambientes" aria-labelledby="amb" className={styles.paths}>
            <h2 id="amb">Quatro caminhos, uma só experiência.</h2>
            <ul className={styles.bands}>
              {AMBIENTES.map(({ href, nome, texto, Icone }) => (
                <li key={href}>
                  <Link href={href} className={`${styles.band} ${FOCO}`}>
                    <strong>{nome}</strong>
                    <span>{texto}</span>
                    <Icone aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section id="como-funciona" aria-labelledby="como-titulo" className={styles.guide}>
            <div className={LARGURA}>
              <div className={styles.guidePanel}>
                <div className={styles.guideBackdrop} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div className={styles.guideIntro}>
                  <h2 id="como-titulo" className={TITULO}>
                    Como funciona
                  </h2>
                  <p>Escolha seu ambiente para ver o que você pode fazer no NotaA.</p>
                </div>
                <CartoesHome>
                  {AMBIENTES.map(({ href, nome, descricao, corCaderno }, indice) => (
                    <Link key={href} href={href} className={`${styles.guideCard} ${FOCO}`}>
                      <div className={styles.guideCover}>
                        <span className={styles.guideBrand}>Nota A</span>
                        <span className={styles.guideEdition}>
                          Caderno {indice + 1} · {corCaderno}
                        </span>
                      </div>
                      <h3>{nome}</h3>
                      <p>{descricao}</p>
                      <span className={styles.guideAction}>
                        Ver ambiente <ArrowUpRight size={18} aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </CartoesHome>
              </div>
            </div>
          </section>

          <section id="base" aria-labelledby="bas" className={styles.impact}>
            <svg
              className={styles.wave}
              viewBox="0 0 1440 70"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 0H1440C1210 0 1080 5 880 8S410 3 305 12 100 28 0 56Z" />
            </svg>
            <svg
              className={`${styles.wave} ${styles.bottomWave}`}
              viewBox="0 0 1440 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 30C96 82 127 108 222 69S356 0 421 10C552 32 735 100 869 100S1216 69 1440 15V100H0Z" />
            </svg>
            <div className={`${LARGURA} ${styles.impactGrid}`}>
              <div className={styles.impactIntro}>
                <p className={styles.eyebrow}>Nosso impacto</p>
                <h2 id="bas">
                  Uma educação mais forte em <span>todo o Brasil.</span>
                </h2>
                <a href="#contato" className={`${styles.impactLink} ${FOCO}`}>
                  Tecnologia, dados e propósito para transformar a educação.
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </div>
              <div className={styles.impactStats}>
                <MapaHome />
                <dl className={styles.impactFigures}>
                  <div>
                    <dt>Estudantes impactados</dt>
                    <dd>14M+</dd>
                  </div>
                  <div>
                    <dt>Escolas conectadas</dt>
                    <dd>74 MIL</dd>
                  </div>
                  <div>
                    <dt>Municípios</dt>
                    <dd>5.500</dd>
                  </div>
                </dl>
                <p className={styles.impactNote}>Números ilustrativos</p>
              </div>
            </div>
          </section>

          <section id="perguntas" aria-labelledby="perguntas-titulo" className={styles.faqSection}>
            <svg
              className={`${styles.scrollRibbon} ${styles.faqScrollRibbon}`}
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M1514 34C1430 40 1381 48 1331 92C1261 156 1294 285 1194 278C1108 272 1150 71 1057 67C979 64 968 131 867 144C711 164 535 50 300 47C112 45 112 215 -105 159"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <svg
              className={styles.faqBackdrop}
              viewBox="0 0 1440 640"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <path d="M-158 607C-31 576 -7 294 98 272C213 248 310 396 431 387C575 375 669 168 823 224C958 273 829 437 960 507C1096 579 1232 437 1459 490" />
            </svg>
            <div className={LARGURA}>
              <h2 id="perguntas-titulo" className="font-display">
                Perguntas frequentes
              </h2>
              <div className={styles.faqList}>
                <details>
                  <summary className={FOCO}>Qual ambiente do NotaA é para mim?</summary>
                  <p>
                    Escolha Aluno para estudar para o ENEM, Professor para acompanhar turmas ou
                    Escola para a gestão acadêmica. O ambiente Faculdade está em preparação para o
                    ENADE.
                  </p>
                </details>
                <details>
                  <summary className={FOCO}>Posso estudar para o ENEM pelo NotaA?</summary>
                  <p>
                    Sim. No <Link href="/aluno">ambiente do aluno</Link> você encontra trilhas de
                    estudo, simulados e uma estimativa de nota.
                  </p>
                </details>
                <details>
                  <summary className={FOCO}>Como conhecer o NotaA para minha escola?</summary>
                  <p>
                    Veja os recursos do <Link href="/escola">ambiente da escola</Link> ou{' '}
                    <a href="#contato">entre em contato</a> para conversar com a equipe.
                  </p>
                </details>
              </div>
              <a href="#contato" className={`${styles.faqAction} ${BOTAO_HOME.primario} gap-2`}>
                Fale com a gente <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </section>
        </main>
      </div>

      <div className={styles.footerTransition}>
        <div className={styles.footerCurve} aria-hidden="true" />
      </div>

      <footer className={styles.footer}>
        <div className={`${LARGURA} ${styles.footerFeature}`}>
          <div className={styles.footerFeatureCopy}>
            <Link
              href="/"
              className={`${styles.footerLogo} ${FOCO}`}
              aria-label="Nota A, página inicial"
            >
              <NotaASimbolo className="h-8 w-auto" /> nota A
            </Link>
            <h2>Qual é o seu próximo passo?</h2>
            <div className={styles.footerShortcuts}>
              <Link href="/login" className={BOTAO_HOME.secundario}>
                Entrar
              </Link>
              <Link href="/cadastro" className={BOTAO_HOME.primario}>
                Criar conta
              </Link>
            </div>
            <a href="#ambientes" className={`${styles.footerDiscover} ${FOCO}`}>
              Conhecer os ambientes <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <section id="contato" aria-labelledby="con" className={styles.footerFeatureContact}>
            <h2 id="con">Vamos conversar?</h2>
            <p>Conte quem você é e indicamos o ambiente do NotaA para você.</p>
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
          </section>
        </div>
        <div className={styles.footerBar}>
          <div className={`${LARGURA} ${styles.footerGrid}`}>
            <nav aria-label="Rodapé" className={styles.footerNav}>
              <a href="#ambientes" className={FOCO}>
                Soluções
              </a>
              <a href="#sobre" className={FOCO}>
                Sobre
              </a>
              <a href="#base" className={FOCO}>
                Impacto
              </a>
              <a href="#perguntas" className={FOCO}>
                Perguntas frequentes
              </a>
              <a href="#contato" className={FOCO}>
                Contato
              </a>
            </nav>
            <div className={styles.legal}>
              <p>© 2026 Nota A. Todos os direitos reservados.</p>
              {juridicoCompleto() && (
                <p>
                  {DADOS_JURIDICOS.razaoSocial}, CNPJ {DADOS_JURIDICOS.cnpj}.
                </p>
              )}
              <div>
                <Link href="/privacidade" className={FOCO}>
                  Privacidade
                </Link>
                <Link href="/termos" className={FOCO}>
                  Termos de uso
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.footerPackageVisual} aria-hidden="true">
          <div className={styles.footerPackagePosition}>
            <div className={styles.footerPackageImage}>
              <div className={styles.footerPackageFace}>
                <div className={styles.footerPackageBrand}>
                  <NotaASimbolo className={styles.footerPackageSymbol} />
                  <span>Nota A</span>
                </div>
                <strong>Seu ritmo. Seu ENEM.</strong>
                <span className={styles.footerPackageSubtitle}>Trilhas, simulados e redação</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
