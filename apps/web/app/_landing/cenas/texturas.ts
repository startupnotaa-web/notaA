import { CanvasTexture, SRGBColorSpace } from 'three';
import { SIMBOLO_BORLA, SIMBOLO_CORPO, SIMBOLO_GRADIENTE_X, SIMBOLO_VIEWBOX } from '@notaa/ui/simbolo';

/** Texturas desenhadas em canvas: o símbolo da marca e as "folhas" de exemplo das cenas. Tudo com cores de token. */

export function texturaDeCanvas(largura: number, altura: number, desenhar: (c: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas 2D indisponível.');
  desenhar(c);
  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

export function retanguloArredondado(c: CanvasRenderingContext2D, x: number, y: number, l: number, a: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, l, a, r);
}

/** Desenha o símbolo do Nota A centrado em (cx, cy) com a largura dada, no gradiente e na borla da marca. */
export function desenharSimbolo(
  c: CanvasRenderingContext2D,
  cor: (nome: string) => string,
  cx: number,
  cy: number,
  largura: number,
) {
  const escala = largura / SIMBOLO_VIEWBOX.largura;
  const altura = SIMBOLO_VIEWBOX.altura * escala;
  c.save();
  c.translate(cx - largura / 2, cy - altura / 2);
  c.scale(escala, escala);
  const g = c.createLinearGradient(SIMBOLO_GRADIENTE_X.inicio, 0, SIMBOLO_GRADIENTE_X.fim, 0);
  g.addColorStop(0, cor('brand-cyan'));
  g.addColorStop(0.5, cor('brand-violet'));
  g.addColorStop(1, cor('brand-magenta'));
  c.fillStyle = cor('brand-blue');
  c.fill(new Path2D(SIMBOLO_BORLA));
  c.fillStyle = g;
  c.fill(new Path2D(SIMBOLO_CORPO), 'evenodd');
  c.restore();
}

export interface LinhaDaFolha {
  esquerda: string;
  /** Texto à direita (valor ou situação). */
  direita?: string;
  /** Situação com fundo de tint: cores de token do ambiente. */
  selo?: { fundo: string; texto: string };
  destaque?: boolean;
}

export interface OpcoesDaFolha {
  largura: number;
  altura: number;
  titulo: string;
  linhas: LinhaDaFolha[];
  fontes: { display: string; texto: string };
  cores: { fundo: string; borda: string; titulo: string; texto: string; linha: string; destaque: string };
  /** Escala de tudo, para o mesmo desenho servir folhas de tamanhos diferentes. */
  escala?: number;
}

/** Folha de exemplo (tabela de poucas linhas), no estilo dos cartões das telas do produto. */
export function desenharFolha(c: CanvasRenderingContext2D, o: OpcoesDaFolha) {
  const k = o.escala ?? 1;
  c.fillStyle = o.cores.fundo;
  retanguloArredondado(c, 0, 0, o.largura, o.altura, 24 * k);
  c.fill();
  c.strokeStyle = o.cores.borda;
  c.lineWidth = 3 * k;
  c.stroke();

  const margem = 36 * k;
  c.textBaseline = 'middle';
  c.fillStyle = o.cores.titulo;
  c.font = `600 ${30 * k}px ${o.fontes.display}`;
  c.fillText(o.titulo, margem, margem + 22 * k);

  let y = margem + 78 * k;
  const passo = 62 * k;
  for (const linha of o.linhas) {
    c.strokeStyle = o.cores.linha;
    c.lineWidth = 2 * k;
    c.beginPath();
    c.moveTo(margem, y);
    c.lineTo(o.largura - margem, y);
    c.stroke();
    const meio = y + passo / 2;
    if (linha.destaque) {
      c.fillStyle = o.cores.destaque;
      retanguloArredondado(c, margem - 10 * k, y + 6 * k, o.largura - 2 * margem + 20 * k, passo - 12 * k, 12 * k);
      c.fill();
    }
    c.fillStyle = o.cores.texto;
    c.font = `400 ${26 * k}px ${o.fontes.texto}`;
    c.textAlign = 'left';
    c.fillText(linha.esquerda, margem, meio);
    c.textAlign = 'right';
    const xDireita = o.largura - margem;
    if (linha.selo && linha.direita) {
      c.font = `700 ${22 * k}px ${o.fontes.texto}`;
      const l = c.measureText(linha.direita).width + 28 * k;
      c.fillStyle = linha.selo.fundo;
      retanguloArredondado(c, xDireita - l, meio - 17 * k, l, 34 * k, 17 * k);
      c.fill();
      c.fillStyle = linha.selo.texto;
      c.fillText(linha.direita, xDireita - 14 * k, meio + 1);
    } else if (linha.direita) {
      c.font = `700 ${26 * k}px ${o.fontes.texto}`;
      c.fillStyle = o.cores.titulo;
      c.fillText(linha.direita, xDireita, meio);
    }
    c.textAlign = 'left';
    y += passo;
  }
}
