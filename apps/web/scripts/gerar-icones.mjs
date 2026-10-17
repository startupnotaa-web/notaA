// Gera favicon e ícones do PWA a partir do símbolo da marca.
//
//   pnpm --filter @notaa/web icones
//
// Cada ícone é um quadrado com fundo `paper` (lido de tokens.json, sem hexadecimal aqui) e o
// símbolo centralizado. Largura do símbolo: ~80% do quadrado (README do handoff). No ícone
// "maskable" o sistema recorta um círculo, então o símbolo desce para 60% e não perde as pontas.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const aqui = dirname(fileURLToPath(import.meta.url));
const ui = join(aqui, '../../../packages/ui');
const saida = join(aqui, '../public/brand');

const tokens = JSON.parse(readFileSync(join(ui, 'tokens/tokens.json'), 'utf8'));
const paper = tokens.color.tokens.find((t) => t.name === 'paper').value.light;
const simbolo = readFileSync(join(ui, 'assets/nota-a-simbolo.svg'));

async function quadrado(lado, fracaoDaLargura) {
  const largura = Math.round(lado * fracaoDaLargura);
  const marca = await sharp(simbolo, { density: 384 }).resize({ width: largura }).png().toBuffer();
  return sharp({ create: { width: lado, height: lado, channels: 4, background: paper } })
    .composite([{ input: marca, gravity: 'center' }])
    .png()
    .toBuffer();
}

// ICO com imagens PNG embutidas (aceito por todos os navegadores atuais).
function ico(imagens) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(1, 2); // tipo: ícone
  cabecalho.writeUInt16LE(imagens.length, 4);
  let deslocamento = 6 + 16 * imagens.length;
  const entradas = imagens.map(({ lado, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado >= 256 ? 0 : lado, 0);
    e.writeUInt8(lado >= 256 ? 0 : lado, 1);
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(deslocamento, 12);
    deslocamento += png.length;
    return e;
  });
  return Buffer.concat([cabecalho, ...entradas, ...imagens.map((i) => i.png)]);
}

const alvos = [
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 0.8],
  ['maskable-icon.png', 512, 0.6],
];
for (const [arquivo, lado, fracao] of alvos) {
  writeFileSync(join(saida, arquivo), await quadrado(lado, fracao));
  console.log(`gerado ${arquivo}`);
}

const lados = [16, 32, 48];
const imagens = await Promise.all(lados.map(async (lado) => ({ lado, png: await quadrado(lado, 0.8) })));
writeFileSync(join(saida, 'favicon.ico'), ico(imagens));
console.log('gerado favicon.ico');
