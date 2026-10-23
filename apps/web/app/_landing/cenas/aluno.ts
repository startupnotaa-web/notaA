import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Vector2,
} from 'three';
import { Base, rastrearPonteiro, suavizar } from './base';
import type { Cena, ContextoCena, ModuloCena } from './tipos';

// Aluno: a trilha em visão isométrica. Os ladrilhos acendem uma vez, na entrada, um depois do outro.
// Depois disso a cena responde: o ladrilho sob o ponteiro sobe, a moeda acompanha o ponteiro e gira ao toque.

const LADRILHOS = 7;
const ACESOS = 5; // a trilha mostra progresso: sobram dois por acender
const ALTURA_DO_LADRILHO = 0.22;

export const montar: ModuloCena['montar'] = (alvo: HTMLElement, raiz: HTMLElement, ctx: ContextoCena): Cena => {
  const ponteiro = rastrearPonteiro(raiz);
  const raio = new Raycaster();
  const ndc = new Vector2();
  const trilha = new Group();

  const base = new Base(alvo, {
    camera: 'ortografica',
    tamanho: 6.6,
    aoFalhar: ctx.aoFalhar,
    aoQuadro: (dt, t) => {
      trilha.rotation.y = Math.sin(t * 0.25) * 0.05;

      ndc.set(ponteiro.estado.x, ponteiro.estado.y);
      raio.setFromCamera(ndc, base.camera);
      const sob = ponteiro.estado.dentro ? raio.intersectObjects(topos, false)[0]?.object : undefined;

      topos.forEach((topo, i) => {
        const acende = Math.min(Math.max((t - (0.5 + i * 0.4)) / 0.35, 0), 1);
        const lit = i < ACESOS ? acende : 0;
        const material = topo.material as MeshStandardMaterial;
        material.color.copy(apagado).lerp(aceso, lit);
        material.emissive.copy(aceso).multiplyScalar(0.55 * lit);
        const alvoY = ALTURA_DO_LADRILHO / 2 + (topo === sob ? 0.14 : 0);
        topo.position.y = suavizar(topo.position.y, alvoY, dt, 14);
      });

      // A moeda olha para o ponteiro; ao toque, dá uma volta.
      moeda.userData.giro = (moeda.userData.giro ?? 0) * Math.exp(-3 * dt);
      moeda.rotation.y = suavizar(moeda.rotation.y, ponteiro.estado.x * 0.9, dt, 5) + (moeda.userData.giro ?? 0) * dt * 6;
    },
  });
  base.camera.position.set(6, 6, 6);
  base.camera.lookAt(0, 0.4, 0);
  base.cena.add(trilha);
  base.cena.add(new AmbientLight(ctx.cor('amb-ink'), 1.6));
  const sol = new DirectionalLight(ctx.cor('amb-ink'), 1.1);
  sol.position.set(4, 8, 3);
  base.cena.add(sol);

  const lajeGeo = new BoxGeometry(0.9, ALTURA_DO_LADRILHO, 0.9);
  const laje = new MeshStandardMaterial({ color: ctx.cor('amb-bg-deep'), roughness: 0.8 });
  const topoGeo = new BoxGeometry(0.82, ALTURA_DO_LADRILHO * 0.6, 0.82);
  const aceso = new Color(ctx.cor('amb-accent'));
  const apagado = new Color(ctx.cor('amb-bg-2'));
  const topos: Mesh[] = [];

  for (let i = 0; i < LADRILHOS; i++) {
    const x = (i % 2) * 1.15 - 0.58;
    const z = 3.3 - i * 1.1;
    const base3 = new Mesh(lajeGeo, laje);
    base3.position.set(x, 0, z);
    trilha.add(base3);
    const topo = new Mesh(topoGeo, new MeshStandardMaterial({ color: apagado, roughness: 0.5 }));
    topo.position.set(x, ALTURA_DO_LADRILHO / 2, z);
    trilha.add(topo);
    topos.push(topo);
  }

  // Moeda de pé sobre o último ladrilho aceso.
  const moeda = new Mesh(
    new CylinderGeometry(0.42, 0.42, 0.1, 40),
    new MeshStandardMaterial({ color: ctx.cor('amb-sun'), roughness: 0.35, metalness: 0.3 }),
  );
  moeda.rotation.z = Math.PI / 2;
  const doUltimoAceso = topos[ACESOS - 1]!;
  moeda.position.set(doUltimoAceso.position.x, 0.95, doUltimoAceso.position.z);
  trilha.add(moeda);

  const girar = () => (moeda.userData.giro = 6);
  raiz.addEventListener('pointerdown', girar);

  base.desenhar();
  return {
    pausar: () => base.pausar(),
    retomar: () => base.retomar(),
    destruir: () => {
      raiz.removeEventListener('pointerdown', girar);
      ponteiro.parar();
      base.destruir();
    },
  };
};
