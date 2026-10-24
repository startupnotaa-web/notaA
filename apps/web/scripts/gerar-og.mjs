// Gera as imagens de compartilhamento (Open Graph, 1200×630) das páginas públicas em public/og.
//
//   pnpm --filter @notaa/web og
//
// Cada imagem é o fundo do ambiente, o símbolo da marca e o nome do ambiente. As cores vêm de tokens.json
// (sem hexadecimal aqui), como em gerar-icones.mjs. O texto usa a fonte sem serifa do sistema onde o script
// roda: Sora não vem instalada, então o nome do ambiente sai em fonte genérica. É uma imagem de compartilhamento,
// não a landing; se a marca pedir a fonte exata, instale Sora na máquina que gera.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const aqui = dirname(fileURLToPath(import.meta.url));
const ui = join(aqui, '../../../packages/ui');
const saida = join(aqui, '../public/og');

const tokens = JSON.parse(readFileSync(join(ui, 'tokens/tokens.json'), 'utf8'));
const simbolo = readFileSync(join(ui, 'assets/nota-a-simbolo.svg'));

const sistema = (nome) => tokens.color.tokens.find((t) => t.name === nome).value.light;
const ambiente = (grupo, nome) => tokens.ambientes.groups.find((g) => g.id === grupo).tokens.find((t) => t.name === `amb-${nome}`).value;

const PAGINAS = [
  { slug: 'home', titulo: 'Nota A', sub: 'Um ambiente para cada papel', fundo: sistema('paper'), tinta: sistema('ink'), apoio: sistema('ink-muted') },
  { slug: 'aluno', titulo: 'Aluno', sub: 'Um passo por dia até o ENEM', fundo: ambiente('aluno', 'bg'), tinta: ambiente('aluno', 'ink'), apoio: ambiente('aluno', 'accent') },
  { slug: 'professores', titulo: 'Professor', sub: 'Turmas e alunos em um painel só', fundo: ambiente('professor', 'bg'), tinta: ambiente('professor', 'accent-hover'), apoio: ambiente('professor', 'ink-muted') },
  { slug: 'escola', titulo: 'Escola', sub: 'Boletim e frequência com a sua regra de média', fundo: ambiente('escola', 'navy'), tinta: ambiente('escola', 'on-navy'), apoio: ambiente('escola', 'on-navy-muted') },
  { slug: 'faculdade', titulo: 'Faculdade', sub: 'Módulo ENADE, em breve', fundo: ambiente('faculdade', 'bg'), tinta: ambiente('faculdade', 'ink'), apoio: ambiente('faculdade', 'accent') },
];

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
mkdirSync(saida, { recursive: true });

for (const p of PAGINAS) {
  const marca = await sharp(simbolo, { density: 384 }).resize({ width: 220 }).png().toBuffer();
  const texto = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <text x="90" y="430" font-family="Helvetica, Arial, sans-serif" font-size="120" font-weight="700" fill="${p.tinta}">${escapar(p.titulo)}</text>
    <text x="94" y="500" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="${p.apoio}">${escapar(p.sub)}</text>
  </svg>`);
  const png = await sharp({ create: { width: 1200, height: 630, channels: 4, background: p.fundo } })
    .composite([
      { input: marca, left: 90, top: 90 },
      { input: texto, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  writeFileSync(join(saida, `${p.slug}.png`), png);
  console.log(`gerado og/${p.slug}.png`);
}
