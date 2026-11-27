import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CabecalhoAbertura } from './CabecalhoAbertura';
import { FormularioLead } from '../_landing/componentes/FormularioLead';
import { NotaASimbolo } from '@notaa/ui';
import { DADOS_JURIDICOS, juridicoCompleto } from '../../lib/publico/juridico';
import { BOTAO_HOME, FOCO, FORM_HOME } from '../_landing/componentes/estilos';
import { metadadosDaPagina } from '../../lib/publico/site';
import { FundoAbertura } from './FundosHome';
import { SequenciaAbertura } from './SequenciaAbertura';
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
    texto: 'Prepare-se para o ENEM com trilhas, simulados e correção de redação.',
    acao: 'Explorar estudos',
    corCaderno: 'Azul',
    descricao: 'Monte sua trilha de estudos, faça simulados e acompanhe sua nota estimada do ENEM.',
  },
  {
    href: '/professores',
    nome: 'Professor',
    texto: 'Organize suas turmas e acompanhe o progresso de cada aluno.',
    acao: 'Conhecer o painel',
    corCaderno: 'Amarelo',
    descricao: 'Organize suas aulas e turmas e acompanhe o progresso dos alunos em um painel.',
  },
  {
    href: '/escola',
    nome: 'Escola',
    texto: 'Acompanhe frequência, calcule médias e organize boletins.',
    acao: 'Ver gestão escolar',
    corCaderno: 'Branco',
    descricao: 'Gerencie boletins e frequência e importe as planilhas da secretaria.',
  },
  {
    href: '/faculdade',
    nome: 'Faculdade',
    texto: 'Conheça o ambiente em preparação para o ENADE.',
    acao: 'Ver o que vem aí',
    corCaderno: 'Rosa',
    descricao:
      'Conheça o ambiente em preparação para o ENADE e veja como entrar na lista de espera.',
  },
];

const LARGURA = 'mx-auto w-full max-w-landing px-5 md:px-10';
const TITULO = 'font-display text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.08] tracking-tight';

function CaixaHome() {
  return (
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
  );
}

export default function Home() {
  return (
    <div data-theme="light" className="min-h-screen overflow-x-clip bg-surface font-text text-ink">
      <div>
        <CabecalhoAbertura />
        <main id="conteudo" tabIndex={-1}>
          <section id="sobre" className={styles.clubHero}>
            <div className={styles.clubHeroContainer}>
              <div className={styles.clubHeroInner}>
                <div className={styles.clubHeroContent}>
                  <div className={styles.clubHeroCopy}>
                    <h1 className={styles.clubHeroTitle}>Unbox stories worth talking about</h1>
                    <p className={styles.clubHeroParagraph}>
                      Join the book club that’s anything but traditional. Choose up to 3 new reads every month, delivered to your door. Then dive into the stories, and the conversations.
                    </p>
                  </div>
                  <a className={styles.clubHeroAction} href="https://app.aardvarkbookclub.com/books" target="_blank" rel="noreferrer">
                    <span className={styles.clubButtonTextWrap}>
                      <span className={styles.clubButtonBg} />
                      <span className={styles.clubButtonTextOuter}>
                        <span className={styles.clubButtonText}>Log-in / Sign-up now</span>
                      </span>
                    </span>
                    <span className={styles.clubButtonIconWrap}>
                      <span className={styles.clubButtonBg} />
                      <span className={styles.clubButtonIconOuter}>
                        <svg viewBox="0 0 14 13" aria-hidden="true">
                          <path d="M13.58 5.66v.845l-5.994 5.66-1.71-2.063a61.427 61.427 0 0 1 4.265-2.988l-.02-.078c-1.828.196-4.107.294-6.387.294H0V4.835h3.734c2.28 0 4.56.098 6.387.294l.02-.059a67.638 67.638 0 0 1-4.265-3.006L7.586 0l5.994 5.66Z" fill="currentColor" />
                        </svg>
                      </span>
                    </span>
                  </a>
                  <div className={styles.clubHeroTextWrap}>
                    <div className={styles.clubHeroTextOuter}>
                      <p className={styles.clubHeroNote}>Shipping to the USA &amp; Canada</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.clubHeroMark}>
              <a href="https://app.aardvarkbookclub.com/books" aria-label="Show Sign up">
                <svg viewBox="0 0 80 80" aria-hidden="true">
                  <path fill="currentColor" d="m53.332 55.909-9.81-22.05c1.253-3.071 4.434-12.573 1.132-24.425a.845.845 0 0 0-.602-.6.82.82 0 0 0-.82.24c-.096.12-2.651 2.711-4.507 6.19-2.58 4.799-2.531 8.854.12 11.78 2.917 3.192 3.062 5.423 2.893 6.431l-.555.048c-.988-2.111-4.29-8.062-12.51-13.82a.734.734 0 0 0-.698-.072c-.242.096-.386.336-.41.576-.314 3.839.723 11.3 6.893 12.212 3.881.576 5.183 1.68 5.593 2.136-.121.816-.41 1.871-.989 3.239l-7.28 16.651h-.023a1.456 1.456 0 0 1-.12.288l-.097.192c-1.157 2.471-5.327 6.766-6.99 8.446-.41.431-.7.72-.796.84-.096.12-.385.575.169 1.175.771.84 3.182 1.895 4.315 1.104.337-.24.53-.48.747-.768.627-.816 4.001-4.559 9.424-9.261 0 0 1.76-2.184 4.435-2.52h1.616c1.205 0 2.169.288 2.723 1.512l.892 2.04c.844 1.943.844 2.998-2 3.454v1.296h11.642v-1.248c-2.363-.432-2.869-1.727-4.387-5.086Zm-13.233-7.27a2.284 2.284 0 0 1-2.29-2.28 2.284 2.284 0 0 1 2.29-2.279 2.284 2.284 0 0 1 2.29 2.28c0 1.247-1.037 2.279-2.29 2.279Z" />
                  <path fill="currentColor" fillRule="evenodd" d="M40.922 0C63.522 0 80 18.401 80 41.1 80 63.8 63.522 80 40.922 80S0 63.8 0 41.1C0 18.402 18.321 0 40.922 0Zm22.857 15.697c-13.817-13.474-36.234-13.754-49.77 0C.473 29.45 2.035 50.379 15.852 63.853 29.67 77.327 52.823 79.81 66.36 66.055c13.537-13.754 11.237-36.884-2.58-50.358Z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            <FundoAbertura className={styles.clubHeroBackdrop} />
            <SequenciaAbertura
              className={styles.clubHeroSequence}
              elementClassName={styles.clubHeroSequenceElement}
              canvasClassName={styles.clubHeroSequenceCanvas}
            />
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
                d="M-260 122C-70 104 257 9 388 67C491 113 521 196 483 290C415 452 259 519 144 474C35 431 68 308 198 245C348 169 621 176 822 265C962 326 1027 443 1130 451C1235 459 1328 369 1420 422C1510 451 1580 468 1710 447"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <p className={styles.ribbonCallout}>Discover hidden gems and buzzy new releases</p>
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
            <h2 id="amb">Qual é o seu ambiente?</h2>
            <ul className={styles.bands}>
              {AMBIENTES.map(({ href, nome, texto, acao }) => (
                <li key={href}>
                  <Link href={href} className={`${styles.band} ${FOCO}`}>
                    <div className={styles.bandCopy}>
                      <strong>{nome}</strong>
                      <span>{texto}</span>
                    </div>
                    <span className={styles.bandAction}>
                      {acao} <ArrowUpRight aria-hidden="true" />
                    </span>
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
                d="M1660 34C1510 40 1381 48 1331 92C1261 156 1294 285 1194 278C1108 272 1150 71 1057 67C979 64 968 131 867 144C711 164 535 50 300 47C112 45 112 215 -250 159"
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
            <CaixaHome />
          </div>
        </div>
      </footer>
    </div>
  );
}
