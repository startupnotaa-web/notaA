import { AmbientLight, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { Base } from './base';
import { desenharFolha, texturaDeCanvas, type OpcoesDaFolha } from './texturas';
import type { Cena, ContextoCena, ModuloCena } from './tipos';

// Escola: três folhas (regra, boletim, importação) num carrossel. Gira devagar sozinho e, ao arrastar, a pessoa
// assume: a folha acompanha o dedo e solta com inércia. Os números são de exemplo e a cena é decorativa.

const RAIO = 3.6;
const LARGURA = 3;
const ALTURA = 4;
const VELOCIDADE_OCIOSA = (Math.PI * 2) / 40; // uma volta a cada 40 s

export const montar: ModuloCena['montar'] = (alvo: HTMLElement, raiz: HTMLElement, ctx: ContextoCena): Cena => {
  const carrossel = new Group();
  let velocidade = VELOCIDADE_OCIOSA;
  let arrastando = false;
  let ultimoX = 0;

  const base = new Base(alvo, {
    camera: 'perspectiva',
    tamanho: 32,
    aoFalhar: ctx.aoFalhar,
    aoQuadro: (dt) => {
      if (!arrastando) {
        // A inércia do arraste decai até a velocidade ociosa.
        velocidade += (VELOCIDADE_OCIOSA - velocidade) * (1 - Math.exp(-1.6 * dt));
        carrossel.rotation.y += velocidade * dt;
      }
    },
  });
  base.camera.position.set(0, 1.6, 13.5);
  base.camera.lookAt(0, 0, 0);
  carrossel.rotation.x = -0.1;
  base.cena.add(carrossel);
  base.cena.add(new AmbientLight(ctx.cor('amb-surface'), 1));

  const cores: OpcoesDaFolha['cores'] = {
    fundo: ctx.cor('amb-surface'),
    borda: ctx.cor('amb-line'),
    titulo: ctx.cor('amb-navy'),
    texto: ctx.cor('amb-ink'),
    linha: ctx.cor('amb-line'),
    destaque: ctx.cor('amb-accent-tint'),
  };
  const ok = { fundo: ctx.cor('success-tint'), texto: ctx.cor('success') };
  const atencao = { fundo: ctx.cor('warning-tint'), texto: ctx.cor('warning') };
  const erro = { fundo: ctx.cor('danger-tint'), texto: ctx.cor('danger') };
  const folhas: Pick<OpcoesDaFolha, 'titulo' | 'linhas'>[] = [
    {
      titulo: 'Regra de avaliação',
      linhas: [
        { esquerda: 'Prova', direita: 'peso 5' },
        { esquerda: 'Trabalho', direita: 'peso 3' },
        { esquerda: 'Participação', direita: 'peso 2' },
        { esquerda: 'Média de aprovação', direita: '6,0' },
        { esquerda: 'Versão 3, vigente', destaque: true },
      ],
    },
    {
      titulo: 'Boletim do 3º trimestre',
      linhas: [
        { esquerda: 'Matemática  7,4', direita: 'Aprovada', selo: ok },
        { esquerda: 'Física  5,8', direita: 'Recuperação', selo: atencao },
        { esquerda: 'História  7,9', direita: 'Aprovada', selo: ok },
        { esquerda: 'Situação', direita: 'Publicado', selo: ok },
      ],
    },
    {
      titulo: 'Importação de planilha',
      linhas: [
        { esquerda: 'Alunos novos', direita: '252' },
        { esquerda: 'Atualizados', direita: '28' },
        { esquerda: 'Com erro', direita: '20' },
        { esquerda: 'Para revisar', direita: '20 linhas', selo: erro },
      ],
    },
  ];

  const geometria = new PlaneGeometry(LARGURA, ALTURA);
  folhas.forEach((f, i) => {
    const textura = texturaDeCanvas(600, 800, (c) =>
      desenharFolha(c, { largura: 600, altura: 800, ...f, fontes: ctx.fontes, cores, escala: 1 }),
    );
    // Só a frente: a folha de trás some, como no `backface-visibility: hidden` da arte estática.
    const folha = new Mesh(geometria, new MeshBasicMaterial({ map: textura }));
    const angulo = (i / folhas.length) * Math.PI * 2;
    folha.position.set(Math.sin(angulo) * RAIO, 0, Math.cos(angulo) * RAIO);
    folha.rotation.y = angulo;
    carrossel.add(folha);
  });

  // Arrastar gira o carrossel. `touch-action: pan-y` deixa a página rolar na vertical no celular.
  alvo.style.cursor = 'grab';
  raiz.style.touchAction = 'pan-y';
  const descer = (e: PointerEvent) => {
    arrastando = true;
    ultimoX = e.clientX;
    alvo.style.cursor = 'grabbing';
    raiz.setPointerCapture?.(e.pointerId);
  };
  const mover = (e: PointerEvent) => {
    if (!arrastando) return;
    const dx = e.clientX - ultimoX;
    ultimoX = e.clientX;
    const delta = dx * 0.008;
    carrossel.rotation.y += delta;
    velocidade = delta * 60;
  };
  const soltar = () => {
    arrastando = false;
    alvo.style.cursor = 'grab';
  };
  raiz.addEventListener('pointerdown', descer);
  raiz.addEventListener('pointermove', mover);
  raiz.addEventListener('pointerup', soltar);
  raiz.addEventListener('pointercancel', soltar);

  base.desenhar();
  return {
    pausar: () => base.pausar(),
    retomar: () => base.retomar(),
    destruir: () => {
      raiz.removeEventListener('pointerdown', descer);
      raiz.removeEventListener('pointermove', mover);
      raiz.removeEventListener('pointerup', soltar);
      raiz.removeEventListener('pointercancel', soltar);
      raiz.style.touchAction = '';
      base.destruir();
    },
  };
};
