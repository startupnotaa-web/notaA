// Falha se houver cor literal (#rrggbb, rgb(), rgba()) fora dos arquivos de tokens.
//
//   node scripts/verificar-cores.mjs
//
// As cores vivem em packages/ui/tokens/tokens.json e no CSS gerado a partir dele. Código, estilos e
// documentação usam variáveis (var(--ink)), utilitários do preset (text-ink) ou corDoToken().
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTAS = ['apps', 'packages', 'docs'];
const EXTENSOES = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.json', '.md', '.svg', '.html']);
const IGNORAR_PASTAS = new Set(['node_modules', '.next', '.turbo', 'dist', 'test-results', 'playwright-report', 'coverage']);
// Fontes de verdade e ativos que carregam cor por natureza.
const PERMITIDOS = new Set([
  'packages/ui/tokens/tokens.json',
  'packages/ui/src/tokens/tokens.css',
  'packages/ui/assets/nota-a-simbolo.svg', // arquivo-fonte da marca; a interface usa o componente NotaASimbolo
  'apps/web/public/sw.js', // gerado pelo Serwist no build
]);
const COR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;

const achados = [];
function varrer(dir) {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR_PASTAS.has(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      varrer(caminho);
      continue;
    }
    const rel = relative(raiz, caminho).split('\\').join('/');
    if (PERMITIDOS.has(rel) || !EXTENSOES.has(nome.slice(nome.lastIndexOf('.')))) continue;
    readFileSync(caminho, 'utf8')
      .split('\n')
      .forEach((linha, i) => {
        for (const m of linha.matchAll(COR)) achados.push(`${rel}:${i + 1}: ${m[0]}`);
      });
  }
}
for (const pasta of PASTAS) varrer(join(raiz, pasta));

if (achados.length) {
  console.error(`Cor literal fora de tokens (${achados.length}):\n${achados.slice(0, 40).join('\n')}`);
  console.error('\nUse variáveis dos tokens (var(--ink), text-ink …) ou corDoToken() de @notaa/ui.');
  process.exit(1);
}
console.log('Nenhuma cor literal fora dos tokens.');
