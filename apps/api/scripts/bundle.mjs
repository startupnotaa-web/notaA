// Empacota a API NestJS num único arquivo self-contained e monta a saída no
// formato Build Output API v3 (.vercel/output), que a Vercel serve direto.
//
// Por que bundle: no monorepo pnpm, o `@vercel/node` não inclui os dist dos
// pacotes de workspace (@notaa/*) no Lambda -> `Cannot find module
// '@notaa/contracts'` no boot. Inlinando tudo, não sobra require de workspace.
//
// Entrada = JS já compilado por tsc (tsconfig.vercel.json), que preserva o
// emitDecoratorMetadata (o esbuild sozinho NÃO emite) — essencial p/ a DI do Nest.
import { build } from 'esbuild';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(apiDir, '.vercel', 'output');
const fnDir = path.join(outRoot, 'functions', 'index.func');

// Peers OPCIONAIS do NestJS que não instalamos (plataforma é Fastify, sem
// microservices/websockets/class-validator). O Nest carrega via loadPackage()
// dentro de try/catch — mantê-los external evita o esbuild falhar no build e é
// inofensivo em runtime (nunca são chamados no nosso conjunto de features).
const NEST_OPTIONAL_EXTERNALS = [
  '@nestjs/microservices',
  '@nestjs/microservices/*',
  '@nestjs/websockets',
  '@nestjs/websockets/*',
  '@nestjs/platform-express',
  '@nestjs/platform-socket.io',
  'class-transformer',
  'class-transformer/*',
  'class-validator',
  'cache-manager',
  '@fastify/static',
  '@fastify/view',
];

async function main() {
  await rm(outRoot, { recursive: true, force: true });
  await mkdir(fnDir, { recursive: true });

  await build({
    entryPoints: [path.join(apiDir, 'dist-vercel', 'api', 'index.js')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: path.join(fnDir, 'index.js'),
    external: NEST_OPTIONAL_EXTERNALS,
    minify: false,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'info',
    // reflect-metadata é inlinado pelo esbuild via `import 'reflect-metadata'`
    // no topo do entry (api/index.ts) — roda antes de qualquer decorator.
    // NÃO usar banner com require('reflect-metadata'): banner é texto não
    // bundlado e vira require externo, que falha no Lambda (sem node_modules).
  });

  // Build Output API v3 — roteia tudo para a função única `index`.
  await writeFile(
    path.join(outRoot, 'config.json'),
    JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/index' }] }, null, 2),
  );

  await writeFile(
    path.join(fnDir, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs22.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        shouldAddHelpers: true,
        supportsResponseStreaming: false,
      },
      null,
      2,
    ),
  );

  console.log('[bundle] .vercel/output pronto:', outRoot);
}

main().catch((err) => {
  console.error('[bundle] falhou:', err);
  process.exit(1);
});
