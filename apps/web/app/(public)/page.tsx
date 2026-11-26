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

const LARGURA = 'mx-auto w-full max-w-landing px-5 md:px-10';
const TITULO = 'font-display text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.08] tracking-tight';

export default function Home() {
  return (
    <div data-theme="light" className="min-h-screen overflow-x-clip bg-paper font-text text-ink">
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
            <div>
              <h1 className="max-w-[10em] font-display text-[clamp(2.25rem,5.3vw,5.25rem)] font-extrabold leading-[1.04] tracking-[-0.055em]">
                Educação não deveria caber em <span className="text-primary">uma caixa.</span>
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
            <ArteHome />
          </section>

          <section
            aria-labelledby="manifesto"
            className={`${LARGURA} grid gap-6 pb-16 md:grid-cols-[1fr_18rem] md:items-center lg:pb-24`}
          >
            <h2 id="manifesto" className={TITULO}>
              De quem aprende
              <br />
              <span className="text-primary">para quem ensina</span>
              <br />e quem transforma.
            </h2>
            <p className="border-l border-primary pl-5 text-lead text-ink-muted">
              Cada ambiente reúne as ferramentas de que você precisa no dia a dia.
            </p>
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

          <section
            id="como-funciona"
            aria-labelledby="como-titulo"
            className={`${LARGURA} ${styles.guide}`}
          >
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

          <div className={`${LARGURA} ${styles.impactDetails}`}>
            {IGUAL_EM_TODOS.map((item) => (
              <div key={item.titulo}>
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
              </div>
            ))}
          </div>

          <section id="contato" aria-labelledby="con" className={`${LARGURA} py-16 lg:py-24`}>
            <div className="flex flex-wrap items-center gap-8 rounded-[32px] bg-violet-tint p-5 md:p-12">
              <div className="min-w-0 flex-[1_1_320px]">
                <h2 id="con" className={TITULO}>
                  Se a educação muda, <span className="text-primary">tudo muda.</span>
                </h2>
                <p className="mt-4 text-lead text-ink-muted">
                  Conte quem você é e indicamos o ambiente para você.
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
        </main>
      </div>

      <footer className={styles.footer}>
        <div className={`${LARGURA} ${styles.footerGrid}`}>
          <Link
            href="/"
            className={`${styles.footerLogo} ${FOCO}`}
            aria-label="Nota A, página inicial"
          >
            <NotaASimbolo className="h-6 w-auto" /> nota A
          </Link>
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
      </footer>
    </div>
  );
}
