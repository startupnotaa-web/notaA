// Garante que o three não entra no JS inicial das páginas públicas e informa o tamanho dos chunks das cenas.
//
//   pnpm --filter @notaa/web build && pnpm --filter @notaa/web verificar:bundle
//
// Lê .next/app-build-manifest.json (os arquivos que cada rota carrega de cara) e procura a assinatura do three
// (WebGLRenderer) nesses arquivos. Falha se achar. Depois lista os chunks que a contêm: são os das cenas, e só
// o import() do Palco os pede, depois do evento load.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '.next');
const manifesto = JSON.parse(readFileSync(join(raiz, 'app-build-manifest.json'), 'utf8'));
const ASSINATURA = 'WebGLRenderer';
const ROTAS = ['/(public)/page', '/(ambientes)/aluno/page', '/(ambientes)/professores/page', '/(ambientes)/escola/page', '/(ambientes)/faculdade/page'];
const contem = (arquivo) => readFileSync(join(raiz, arquivo), 'utf8').includes(ASSINATURA);

let falhou = false;
for (const rota of ROTAS) {
  const arquivos = (manifesto.pages[rota] ?? []).filter((f) => f.endsWith('.js'));
  if (!arquivos.length) {
    console.error(`rota ausente no manifesto: ${rota}`);
    falhou = true;
    continue;
  }
  const comThree = arquivos.filter(contem);
  const kb = Math.round(arquivos.reduce((s, f) => s + gzipSync(readFileSync(join(raiz, f))).length, 0) / 1024);
  console.log(`${comThree.length ? 'FALHA' : 'ok   '} ${rota}: ${arquivos.length} arquivos, ${kb} kB gzip no carregamento inicial`);
  if (comThree.length) {
    falhou = true;
    console.error(`  contém three: ${comThree.join(', ')}`);
  }
}

console.log('\nChunks com o three (carregados só pelo Palco, depois do load):');
const pasta = join(raiz, 'static/chunks');
const procurar = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? procurar(p) : n.endsWith('.js') ? [p] : [];
  });
for (const arquivo of procurar(pasta)) {
  const conteudo = readFileSync(arquivo);
  if (conteudo.includes(ASSINATURA)) console.log(`  ${arquivo.slice(raiz.length + 1)}: ${Math.round(gzipSync(conteudo).length / 1024)} kB gzip`);
}
process.exit(falhou ? 1 : 0);
