# Assets de marca

Gerados a partir de `2.png` (logo sobre fundo preto puro), conforme `docs/07-design-system.md` §3 e `docs/09-estrutura-repositorio.md` §5 passo 2.

## Como foram gerados

`2.png` estava composta sobre `#000000` puro. Em vez de um corte raso, foi feito **"unscreen"**: como cor_observada = cor_real × alpha sobre fundo preto, recuperamos `alpha = max(r,g,b)` e desfizemos a pré-multiplicação — resultado é um PNG com **transparência real e bordas limpas**, sem halo escuro residual.

O cordão/borla (tassel) foi removido cirurgicamente (máscara por região, preservando a ponta do diamante e as duas pernas do "A") para gerar a versão **sem tassel** usada em ícones quadrados — o tassel fino não é legível em tamanhos pequenos (16–48px) e sua remoção evita um recorte quadrado deselegante.

## Arquivos

| Arquivo                         | Conteúdo                                                       | Uso                                                  |
| ------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `logo-full.png`                 | Logo completa (com tassel), transparente                       | Header do App Shell, landing                         |
| `logo-mark.png`                 | Só o mark (diamante/capelo + pernas, sem tassel), transparente | Base para favicon/ícones; contextos compactos        |
| `logo-mono-white.png`           | Mark em branco sólido, transparente                            | Sobre fundos de marca/gradiente; modo alto-contraste |
| `favicon.ico`                   | Multi-tamanho (16/32/48/64), transparente                      | `<link rel="icon">`                                  |
| `icon-192.png` / `icon-512.png` | Mark centrado sobre `--bg-base #080E32`, opaco                 | `manifest.json` (PWA)                                |
| `maskable-icon.png`             | Mark dentro da safe zone (~76% central) sobre `--bg-base`      | `manifest.json` (`purpose: maskable`)                |
| `splash.png`                    | Logo completa centrada sobre `--bg-splash #000000`, 1080×1920  | Splash/abertura                                      |

## ⚠️ Pendência conhecida — SVG vetorial

`docs/09` previa `logo-mark.svg` / `logo-full.svg` / `logo-mono-white.svg`. **Não foram gerados como SVG.** Vetorizar (tracing) uma arte rasterizada com gradiente produziria contornos degradados/serrilhados e **não deveria ser tratado como asset final da marca**. Os masters em SVG exigem o **arquivo de origem vetorial** (Figma/Illustrator/AI) de quem criou a logo — recomenda-se obtê-lo antes do lançamento público. Até então, os PNGs em alta resolução acima cobrem todos os usos do MVP (header, ícones PWA, splash); a otimização de entrega (responsive sizing, lazy loading) fica a cargo do `next/image` no passo 7.
