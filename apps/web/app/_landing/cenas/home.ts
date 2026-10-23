import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Group,
  LineDashedMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  Vector3,
} from 'three';
import { Base, rastrearPonteiro, suavizar } from './base';
import { desenharSimbolo, retanguloArredondado, texturaDeCanvas } from './texturas';
import type { Cena, ContextoCena, ModuloCena } from './tipos';

// Home: o cubo da marca no centro, e os quatro ambientes em órbita. A cena inteira gira devagar (a única
// animação autônoma) e se inclina para onde o ponteiro aponta. Os quatro rótulos são links HTML
// (`[data-ancora]`, na ordem da lista): a cena só calcula onde cada um fica a cada quadro.

// Escala: a cena cabe num palco quase quadrado, e os rótulos (188px) ficam dentro dele nos pontos mais
// largos da órbita. Câmera longe e campo estreito mantêm a perspectiva leve.
const RAIO_ORBITA = 3.1;
const DISTANCIA_CAMERA = 16;

function circulo(raio: number, passos = 160): BufferGeometry {
  const pontos: Vector3[] = [];
  for (let i = 0; i < passos; i++) {
    const a = (i / passos) * Math.PI * 2;
    pontos.push(new Vector3(Math.cos(a) * raio, 0, Math.sin(a) * raio));
  }
  return new BufferGeometry().setFromPoints(pontos);
}

function orbita(raio: number, cor: string, opacidade: number): LineLoop {
  const linha = new LineLoop(
    circulo(raio),
    new LineDashedMaterial({ color: cor, dashSize: 0.14, gapSize: 0.12, transparent: true, opacity: opacidade }),
  );
  linha.computeLineDistances();
  return linha;
}

export const montar: ModuloCena['montar'] = (alvo: HTMLElement, raiz: HTMLElement, ctx: ContextoCena): Cena => {
  const ancoras = Array.from(raiz.querySelectorAll<HTMLElement>('[data-ancora]'));
  const ponteiro = rastrearPonteiro(raiz);
  const largo = matchMedia('(min-width: 768px)');

  const mundo = new Group();
  const base = new Base(alvo, {
    camera: 'perspectiva',
    tamanho: 32,
    aoFalhar: ctx.aoFalhar,
    aoQuadro: (dt, t) => {
      const inclinaX = suavizar(mundo.userData.inclinaX ?? 0, -ponteiro.estado.y * 0.18, dt);
      const inclinaY = suavizar(mundo.userData.inclinaY ?? 0, ponteiro.estado.x * 0.45, dt);
      mundo.userData.inclinaX = inclinaX;
      mundo.userData.inclinaY = inclinaY;
      // Inclinado para a câmera: o lado da órbita que vem na nossa direção aparece embaixo.
      mundo.rotation.x = 0.42 + inclinaX;
      mundo.rotation.y = t * 0.12 + inclinaY;
      posicionarRotulos();
    },
  });
  base.camera.position.set(0, 1.2, DISTANCIA_CAMERA);
  base.camera.lookAt(0, 0, 0);
  base.cena.add(mundo);

  // Cubo com o símbolo nas quatro laterais.
  const face = texturaDeCanvas(512, 512, (c) => {
    // A face é um quadrado cheio (o cubo não tem canto transparente para virar preto); o arredondado é só a borda.
    const g = c.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, ctx.cor('surface'));
    g.addColorStop(1, ctx.cor('violet-tint'));
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 512);
    c.strokeStyle = ctx.cor('brand-violet');
    c.lineWidth = 14;
    retanguloArredondado(c, 7, 7, 498, 498, 70);
    c.stroke();
    desenharSimbolo(c, ctx.cor, 256, 256, 330);
  });
  const lateral = new MeshStandardMaterial({ map: face, roughness: 0.55, metalness: 0 });
  const cubo = new Mesh(new BoxGeometry(2.6, 2.6, 2.6), lateral);
  mundo.add(cubo);
  base.cena.add(new AmbientLight(ctx.cor('surface'), 2.1));
  const sol = new DirectionalLight(ctx.cor('surface'), 0.9);
  sol.position.set(3, 5, 6);
  base.cena.add(sol);

  // Duas órbitas tracejadas e os quatro nós dos ambientes.
  mundo.add(orbita(RAIO_ORBITA, ctx.cor('brand-violet'), 0.65));
  mundo.add(orbita(4.1, ctx.cor('brand-cyan'), 0.5));
  const nos: Group[] = ancoras.map((el, i) => {
    const no = new Group();
    const a = (i / ancoras.length) * Math.PI * 2;
    no.position.set(Math.sin(a) * RAIO_ORBITA, 0, Math.cos(a) * RAIO_ORBITA);
    const cor = getComputedStyle(el).getPropertyValue('--amb-tag').trim() || ctx.cor('brand-violet');
    no.add(new Mesh(new OctahedronGeometry(0.17), new MeshBasicMaterial({ color: cor })));
    mundo.add(no);
    return no;
  });

  // Losangos soltos, no gradiente da marca.
  [
    { p: [-3.6, 1.9, -0.5], s: 0.3, c: 'brand-cyan' },
    { p: [3.5, 2.3, 0.4], s: 0.16, c: 'brand-violet' },
    { p: [3.1, -2.1, 1], s: 0.22, c: 'brand-magenta' },
    { p: [-3.2, -1.8, 0.8], s: 0.12, c: 'brand-violet' },
  ].forEach(({ p, s, c }) => {
    const m = new Mesh(new OctahedronGeometry(s), new MeshBasicMaterial({ color: ctx.cor(c) }));
    m.position.set(p[0]!, p[1]!, p[2]!);
    mundo.add(m);
  });

  const mundoPos = new Vector3();
  let estavaLargo = true;
  function posicionarRotulos() {
    if (!largo.matches) {
      // No celular os rótulos ficam em grade abaixo da cena: a cena não mexe neles.
      if (estavaLargo) {
        for (const el of ancoras) el.removeAttribute('style');
        estavaLargo = false;
      }
      return;
    }
    estavaLargo = true;
    mundo.updateMatrixWorld();
    nos.forEach((no, i) => {
      const el = ancoras[i];
      if (!el) return;
      no.getWorldPosition(mundoPos);
      const distancia = base.camera.position.distanceTo(mundoPos);
      const perto = Math.min(Math.max((DISTANCIA_CAMERA + RAIO_ORBITA - distancia) / (RAIO_ORBITA * 2), 0), 1);
      mundoPos.project(base.camera);
      el.style.left = `${(mundoPos.x * 0.5 + 0.5) * 100}%`;
      el.style.top = `${(-mundoPos.y * 0.5 + 0.5) * 100}%`;
      el.style.zIndex = String(Math.round(perto * 10));
      el.style.scale = String(0.84 + 0.16 * perto);
    });
  }

  base.desenhar();
  posicionarRotulos();

  return {
    pausar: () => base.pausar(),
    retomar: () => base.retomar(),
    destruir: () => {
      ponteiro.parar();
      base.destruir();
    },
  };
};
