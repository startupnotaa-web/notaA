# Assets de marca

Favicon e ícones do PWA (`favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-icon.png`) são gerados por `pnpm --filter @notaa/web icones` (`scripts/gerar-icones.mjs`) a partir de `packages/ui/assets/nota-a-simbolo.svg`, com o fundo `paper` lido de `tokens.json`.

Na interface use o componente `NotaASimbolo`; nunca um PNG da marca.
