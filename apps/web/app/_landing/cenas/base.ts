import {
  Color,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type BufferGeometry,
  type Camera,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import type { Cena } from './tipos';

export interface OpcoesBase {
  camera: 'perspectiva' | 'ortografica';
  /** Perspectiva: campo de visão em graus. Ortográfica: altura visível em unidades da cena. */
  tamanho: number;
  /** Chamada a cada quadro com o tempo desde o quadro anterior (s) e o tempo total (s). */
  aoQuadro: (dt: number, t: number) => void;
  aoFalhar: () => void;
}

/**
 * Esqueleto comum das cenas: renderer, câmera, loop e descarte.
 *
 * O loop só existe enquanto a cena está visível (`retomar`) e some em `pausar`: fora da viewport ou com a aba
 * oculta a GPU não desenha nada. O fundo é transparente, para a cena herdar o fundo da página.
 */
export class Base implements Cena {
  readonly renderer: WebGLRenderer;
  readonly cena = new Scene();
  readonly camera: PerspectiveCamera | OrthographicCamera;
  private readonly observadorDeTamanho: ResizeObserver;
  private ultimo = 0;
  private total = 0;
  private rodando = false;
  private destruida = false;

  constructor(
    private readonly alvo: HTMLElement,
    private readonly opcoes: OpcoesBase,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(new Color(0x000000), 0);
    alvo.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.opcoes.aoFalhar();
    });

    this.camera =
      opcoes.camera === 'perspectiva'
        ? new PerspectiveCamera(opcoes.tamanho, 1, 0.1, 100)
        : new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

    this.observadorDeTamanho = new ResizeObserver(() => this.redimensionar());
    this.observadorDeTamanho.observe(alvo);
    this.redimensionar();
  }

  redimensionar(): void {
    const largura = Math.max(this.alvo.clientWidth, 1);
    const altura = Math.max(this.alvo.clientHeight, 1);
    // Teto de 2: telas 3x pagariam 2,25x mais pixels sem ganho que se veja numa cena de poucas formas.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(largura, altura, false);
    const proporcao = largura / altura;
    if (this.camera instanceof PerspectiveCamera) {
      this.camera.aspect = proporcao;
    } else {
      const meia = this.opcoes.tamanho / 2;
      this.camera.left = -meia * proporcao;
      this.camera.right = meia * proporcao;
      this.camera.top = meia;
      this.camera.bottom = -meia;
    }
    this.camera.updateProjectionMatrix();
    if (!this.rodando) this.desenhar();
  }

  /** Desenha um quadro agora, com o estado atual (usado ao montar e ao redimensionar parado). */
  desenhar(): void {
    if (!this.destruida) this.renderer.render(this.cena, this.camera as Camera);
  }

  retomar(): void {
    if (this.rodando || this.destruida) return;
    this.rodando = true;
    this.ultimo = 0;
    this.renderer.setAnimationLoop((agora: number) => {
      const dt = this.ultimo ? Math.min((agora - this.ultimo) / 1000, 0.1) : 0;
      this.ultimo = agora;
      this.total += dt;
      this.opcoes.aoQuadro(dt, this.total);
      this.renderer.render(this.cena, this.camera as Camera);
    });
  }

  pausar(): void {
    if (!this.rodando) return;
    this.rodando = false;
    this.renderer.setAnimationLoop(null);
  }

  destruir(): void {
    if (this.destruida) return;
    this.pausar();
    this.destruida = true;
    this.observadorDeTamanho.disconnect();
    this.cena.traverse((o: Object3D) => {
      const malha = o as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
      malha.geometry?.dispose();
      const materiais = Array.isArray(malha.material) ? malha.material : malha.material ? [malha.material] : [];
      for (const m of materiais) {
        for (const valor of Object.values(m)) if ((valor as Texture | undefined)?.isTexture) (valor as Texture).dispose();
        m.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

/**
 * Posição do ponteiro sobre `raiz`, de -1 a 1 (x para a direita, y para cima). Volta a 0 quando o ponteiro
 * sai. É a resposta da cena a quem usa: ela se inclina para onde a pessoa aponta.
 */
export function rastrearPonteiro(raiz: HTMLElement) {
  const estado = { x: 0, y: 0, dentro: false };
  const mover = (e: PointerEvent) => {
    const r = raiz.getBoundingClientRect();
    estado.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    estado.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    estado.dentro = true;
  };
  const sair = () => {
    estado.x = 0;
    estado.y = 0;
    estado.dentro = false;
  };
  raiz.addEventListener('pointermove', mover, { passive: true });
  raiz.addEventListener('pointerleave', sair, { passive: true });
  return {
    estado,
    parar() {
      raiz.removeEventListener('pointermove', mover);
      raiz.removeEventListener('pointerleave', sair);
    },
  };
}

/** Aproxima `atual` de `alvo` em direção ao alvo, independente da taxa de quadros. */
export const suavizar = (atual: number, alvo: number, dt: number, rigidez = 6) =>
  atual + (alvo - atual) * (1 - Math.exp(-rigidez * dt));
