// Gera src/tokens/tokens.css a partir de tokens/tokens.json.
//
//   node scripts/gerar-tokens.mjs           reescreve o CSS
//   node scripts/gerar-tokens.mjs --check   falha se o CSS commitado divergir do JSON
//   node scripts/gerar-tokens.mjs --handoff também reescreve design-handoff/tokens.{json,css}; o CSS
//                                           do handoff não leva as variáveis do next/font, que só o app tem
//
// O tokens.json é a fonte única dos valores de cor. Nenhum outro arquivo do
// monorepo deve repetir um hexadecimal (ver docs/07-design-system.md).
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const entrada = join(raiz, 'tokens', 'tokens.json');
const saida = join(raiz, 'src', 'tokens', 'tokens.css');
const pastaHandoff = join(raiz, '..', '..', 'design-handoff');

// next/font injeta Sora e Atkinson em variáveis próprias (apps/web/app/layout.tsx).
// Elas entram na frente da pilha; o resto do stack segue como fallback.
const VARIAVEL_DA_FONTE = { display: '--nf-sora', text: '--nf-atkinson' };

const tokens = JSON.parse(readFileSync(entrada, 'utf8'));

const linhas = (declaracoes) => {
  // Agrupa as declarações em linhas de até ~110 colunas, como no tokens.css do handoff.
  const out = [];
  let atual = '  ';
  for (const d of declaracoes) {
    if (atual.length > 2 && atual.length + d.length + 1 > 112) {
      out.push(atual.trimEnd());
      atual = '  ';
    }
    atual += `${d} `;
  }
  if (atual.trim()) out.push(atual.trimEnd());
  return out.join('\n');
};

/** `comNextFont` antepõe as variáveis do next/font às famílias de fonte. */
function gerar(comNextFont) {
  const claro = [];
  const escuro = [];
  const dif = (nome, v) => {
    claro.push(`--${nome}: ${v.light};`);
    if (v.dark !== v.light) escuro.push(`--${nome}: ${v.dark};`);
  };

  for (const t of tokens.color.tokens) dif(t.name, t.value);
  for (const t of tokens.shadow.tokens) dif(t.name, t.value);

  for (const [id, pilha] of Object.entries(tokens.type.families)) {
    const base = comNextFont ? VARIAVEL_DA_FONTE[id] : undefined;
    claro.push(`--font-${id}: ${base ? `var(${base}), ` : ''}${pilha};`);
  }
  // Estilos de texto: tamanho, entrelinha, peso e tracking. O preset do Tailwind aponta para estas variáveis.
  for (const grupo of tokens.type.groups) {
    for (const e of grupo.styles) {
      claro.push(
        `--text-${e.name}-size: ${e.fontSize};`,
        `--text-${e.name}-lh: ${e.lineHeight};`,
        `--text-${e.name}-weight: ${e.fontWeight};`,
        `--text-${e.name}-tracking: ${e.letterSpacing ?? '0'};`,
      );
    }
  }
  for (const t of tokens.spacing.tokens) claro.push(`--${t.name}: ${t.value};`);
  for (const t of tokens.radius.tokens) claro.push(`--${t.name}: ${t.value};`);
  for (const t of tokens.duration.tokens) claro.push(`--${t.name}: ${t.value};`);
  for (const t of tokens.easing.tokens) claro.push(`--${t.name}: ${t.value};`);

  return `/* Nota A tokens. Gerado por scripts/gerar-tokens.mjs a partir de tokens/tokens.json. Não edite à mão. */
/* Tema escolhido por data-theme em <html> ou em qualquer contêiner; light é o padrão. */
:root,
[data-theme='light'] {
${linhas(claro)}
}

[data-theme='dark'] {
${linhas(escuro)}
}
`;
}

const css = gerar(true);

if (process.argv.includes('--check')) {
  let atual = '';
  try {
    atual = readFileSync(saida, 'utf8');
  } catch {
    // arquivo ausente: cai na mensagem de divergência abaixo
  }
  if (atual !== css) {
    console.error('src/tokens/tokens.css está fora de sincronia com tokens/tokens.json. Rode: pnpm --filter @notaa/ui tokens');
    process.exit(1);
  }
  console.log('tokens.css em sincronia com tokens.json');
} else {
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, css);
  console.log(`gerado ${saida}`);
  if (process.argv.includes('--handoff') && existsSync(pastaHandoff)) {
    copyFileSync(entrada, join(pastaHandoff, 'tokens.json'));
    writeFileSync(join(pastaHandoff, 'tokens.css'), gerar(false));
    console.log(`atualizado ${pastaHandoff}`);
  }
}
