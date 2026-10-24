import { BoxGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial } from 'three';
import { Base, rastrearPonteiro, suavizar } from './base';
import type { Cena, ContextoCena, ModuloCena } from './tipos';

// Faculdade: dois cubos de arame, um grande e vazado, um pequeno e cheio, girando devagar em sentidos opostos
// (a única animação autônoma). O conjunto inclina para onde o ponteiro aponta.

export const montar: ModuloCena['montar'] = (alvo: HTMLElement, raiz: HTMLElement, ctx: ContextoCena): Cena => {
  const ponteiro = rastrearPonteiro(raiz);
  const conjunto = new Group();

  const base = new Base(alvo, {
    camera: 'perspectiva',
    tamanho: 38,
    aoFalhar: ctx.aoFalhar,
    aoQuadro: (dt, t) => {
      grande.rotation.y = (t * Math.PI * 2) / 38;
      pequeno.rotation.y = -(t * Math.PI * 2) / 26;
      conjunto.rotation.x = suavizar(conjunto.rotation.x, -ponteiro.estado.y * 0.25, dt, 4);
      conjunto.rotation.z = suavizar(conjunto.rotation.z, -ponteiro.estado.x * 0.18, dt, 4);
    },
  });
  base.camera.position.set(0, 1.5, 12);
  base.camera.lookAt(0, 0, 0);
  base.cena.add(conjunto);

  const bordo = ctx.cor('amb-accent');
  const grandeGeo = new BoxGeometry(3.6, 3.6, 3.6);
  const grande = new Group();
  grande.rotation.x = -0.42;
  grande.add(
    new LineSegments(new EdgesGeometry(grandeGeo), new LineBasicMaterial({ color: bordo })),
    new Mesh(grandeGeo, new MeshBasicMaterial({ color: bordo, transparent: true, opacity: 0.05, depthWrite: false })),
  );

  const pequenoGeo = new BoxGeometry(1.9, 1.9, 1.9);
  const pequeno = new Group();
  pequeno.rotation.set(0.31, 0, 0.17);
  pequeno.add(
    new Mesh(pequenoGeo, new MeshBasicMaterial({ color: ctx.cor('amb-ink') })),
    new LineSegments(new EdgesGeometry(pequenoGeo), new LineBasicMaterial({ color: ctx.cor('amb-ink') })),
  );

  conjunto.add(grande, pequeno);
  base.desenhar();
  return {
    pausar: () => base.pausar(),
    retomar: () => base.retomar(),
    destruir: () => {
      ponteiro.parar();
      base.destruir();
    },
  };
};
