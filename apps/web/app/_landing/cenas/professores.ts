import { AmbientLight, DirectionalLight, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { Base, rastrearPonteiro, suavizar } from './base';
import { desenharFolha, texturaDeCanvas, type OpcoesDaFolha } from './texturas';
import type { Cena, ContextoCena, ModuloCena } from './tipos';

// Professor: três painéis empilhados (turma, notas, agenda). Eles abrem uma vez na entrada e depois respondem:
// com o ponteiro sobre a cena os painéis se afastam, e o conjunto gira para onde a pessoa aponta.
// Os dados desenhados nas folhas são de exemplo e a cena é decorativa (a página diz isso).

const LARGURA = 4.6;
const ALTURA = 3.1;

export const montar: ModuloCena['montar'] = (alvo: HTMLElement, raiz: HTMLElement, ctx: ContextoCena): Cena => {
  const ponteiro = rastrearPonteiro(raiz);
  const pilha = new Group();
  const camadas: Mesh[] = [];
  let abertura = 0; // 0 = compacto, 1 = aberto
  let inicio = 0;

  const base = new Base(alvo, {
    camera: 'perspectiva',
    tamanho: 34,
    aoFalhar: ctx.aoFalhar,
    aoQuadro: (dt, t) => {
      // Entrada: abre em 1,1 s. Depois, o alvo de abertura é 0,75 em repouso e 1 com o ponteiro em cima.
      if (!inicio) inicio = t;
      const entrada = Math.min((t - inicio) / 1.1, 1);
      const entradaSuave = 1 - Math.pow(1 - entrada, 3);
      const alvoAbertura = (ponteiro.estado.dentro ? 1 : 0.75) * entradaSuave;
      abertura = suavizar(abertura, alvoAbertura, dt, 5);
      camadas.forEach((c, i) => {
        // Os painéis de baixo recuam em z (e um pouco em x): assim o título e as primeiras linhas de cada um
        // aparecem por trás do painel de cima.
        const atras = camadas.length - 1 - i;
        c.position.set(-atras * (0.9 + abertura * 0.5), i * (0.3 + abertura * 0.45), -atras * (0.9 + abertura * 0.3));
      });
      pilha.rotation.y = -0.52 + suavizar(pilha.rotation.y + 0.52, ponteiro.estado.x * 0.35, dt, 4);
    },
  });
  base.camera.position.set(0, 7.4, 8.2);
  base.camera.lookAt(0, 0.9, 0);
  pilha.rotation.y = -0.52;
  pilha.position.set(0.9, 0, 0.9);
  base.cena.add(pilha);
  base.cena.add(new AmbientLight(ctx.cor('amb-surface'), 1.5));
  const sol = new DirectionalLight(ctx.cor('amb-surface'), 0.6);
  sol.position.set(2, 6, 4);
  base.cena.add(sol);

  const cores: OpcoesDaFolha['cores'] = {
    fundo: ctx.cor('amb-surface'),
    borda: ctx.cor('amb-line'),
    titulo: ctx.cor('amb-ink'),
    texto: ctx.cor('amb-ink'),
    linha: ctx.cor('amb-line'),
    destaque: ctx.cor('amb-amber-tint'),
  };
  const presente = { fundo: ctx.cor('success-tint'), texto: ctx.cor('success') };
  const faltou = { fundo: ctx.cor('danger-tint'), texto: ctx.cor('danger') };
  const folhas: Pick<OpcoesDaFolha, 'titulo' | 'linhas'>[] = [
    {
      titulo: 'Turma 2º ano B',
      linhas: [
        { esquerda: 'Ana Clara', direita: 'Presente', selo: presente },
        { esquerda: 'Bruno Lima', direita: 'Presente', selo: presente },
        { esquerda: 'Carla Dias', direita: 'Faltou', selo: faltou },
      ],
    },
    {
      titulo: 'Notas do bimestre',
      linhas: [
        { esquerda: 'Prova 1', direita: '7,5' },
        { esquerda: 'Trabalho', direita: '8,0' },
        { esquerda: 'Média', direita: '7,8' },
      ],
    },
    {
      titulo: 'Agenda da semana',
      linhas: [
        { esquerda: 'Seg 19h  Revisão de funções', destaque: true },
        { esquerda: 'Qua 19h  Aula 12' },
        { esquerda: 'Sex 18h  Plantão de dúvidas' },
      ],
    },
  ];

  const geometria = new PlaneGeometry(LARGURA, ALTURA);
  folhas.forEach((f, i) => {
    const textura = texturaDeCanvas(920, 620, (c) =>
      desenharFolha(c, { largura: 920, altura: 620, ...f, fontes: ctx.fontes, cores, escala: 1.3 }),
    );
    const folha = new Mesh(geometria, new MeshBasicMaterial({ map: textura, side: DoubleSide, transparent: true }));
    folha.rotation.x = -Math.PI / 2;
    folha.position.y = i * 0.25;
    pilha.add(folha);
    camadas.push(folha);
  });

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
