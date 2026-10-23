import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// A landing não pode mostrar marcas de revisão. Antes, <Confirmar> e <Placeholder> imprimiam
// "[CONFIRMAR]" e "[PLACEHOLDER: ...]" para o visitante. Este teste lê o código das páginas públicas
// e falha se a marca voltar, seja como texto, seja como componente importado.

const RAIZ = join(__dirname, '..', 'app');
const PROIBIDOS = [/\[CONFIRMAR/, /\[PLACEHOLDER/, /\bMarcador\b/, /<Confirmar\b/, /<Placeholder\b/];

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const PAGINAS_PUBLICAS = [
  ...arquivos(join(RAIZ, '(ambientes)')),
  ...arquivos(join(RAIZ, '_landing')),
  join(RAIZ, '(public)', 'page.tsx'),
  join(RAIZ, '(public)', 'privacidade', 'page.tsx'),
  join(RAIZ, '(public)', 'termos', 'page.tsx'),
].filter((f) => /\.(tsx|ts)$/.test(f));

describe('landing: nenhuma marca de revisão chega ao visitante', () => {
  it('as páginas públicas não contêm marcas nem importam o marcador', () => {
    const achados: string[] = [];
    for (const arquivo of PAGINAS_PUBLICAS) {
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .forEach((linha, i) => {
          if (PROIBIDOS.some((rx) => rx.test(linha))) {
            achados.push(`${relative(RAIZ, arquivo)}:${i + 1}: ${linha.trim()}`);
          }
        });
    }
    expect(achados).toEqual([]);
  });

  it('o teste enxerga as páginas (senão passaria por engano)', () => {
    expect(PAGINAS_PUBLICAS.length).toBeGreaterThan(5);
  });
});
