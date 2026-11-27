'use client';

import { useEffect, useRef } from 'react';

const TOTAL_DE_QUADROS = 120;
const INTERVALO_DO_QUADRO = 1000 / 24;

export function SequenciaAbertura({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !section || !context) return;

    const quadros: Array<HTMLImageElement | undefined> = new Array(TOTAL_DE_QUADROS);
    const carregando = new Set<number>();
    const fila: Array<[number, number]> = [];
    let processandoFila = false;
    let larguraJanela = window.innerWidth;
    let quadroAtual = 0;
    let ultimoTempo = 0;
    let animacao = 0;
    let visivel = false;
    let parado = false;

    const desenhar = (imagem?: HTMLImageElement) => {
      if (!imagem || parado) return;
      const proporcao = Math.max(canvas.width / imagem.naturalWidth, canvas.height / imagem.naturalHeight);
      const largura = imagem.naturalWidth * proporcao;
      const altura = imagem.naturalHeight * proporcao;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(imagem, (canvas.width - largura) / 2, (canvas.height - altura) / 2, largura, altura);
    };

    const desenharQuadro = (indice: number) => {
      if (quadros[indice]) {
        desenhar(quadros[indice]);
        return;
      }
      for (let distancia = 1; distancia <= 10; distancia += 1) {
        if (quadros[indice - distancia]) return desenhar(quadros[indice - distancia]);
        if (quadros[indice + distancia]) return desenhar(quadros[indice + distancia]);
      }
    };

    const carregarQuadro = (indice: number, aoCarregar?: () => void) => {
      if (parado || indice < 0 || indice >= TOTAL_DE_QUADROS || quadros[indice] || carregando.has(indice)) return;
      carregando.add(indice);
      const imagem = new Image();
      imagem.onload = () => {
        quadros[indice] = imagem;
        carregando.delete(indice);
        if (indice === quadroAtual) desenhar(imagem);
        aoCarregar?.();
      };
      imagem.onerror = () => carregando.delete(indice);
      imagem.src = `/images/aardvark-sequence/frame_${String(indice).padStart(3, '0')}.webp`;
    };

    const processarFila = () => {
      if (parado || processandoFila) return;
      const proximo = fila.shift();
      if (!proximo) return;
      const [inicio, fim] = proximo;
      if (fim - inicio <= 1) return processarFila();
      processandoFila = true;
      const meio = Math.floor((inicio + fim) / 2);
      carregarQuadro(meio, () => {
        fila.push([inicio, meio], [meio, fim]);
        processandoFila = false;
        processarFila();
      });
    };

    const animar = (tempo: number) => {
      if (parado || !visivel) return;
      if (!ultimoTempo || tempo - ultimoTempo >= INTERVALO_DO_QUADRO) {
        quadroAtual = (quadroAtual + 1) % TOTAL_DE_QUADROS;
        desenharQuadro(quadroAtual);
        ultimoTempo = tempo;
      }
      animacao = window.requestAnimationFrame(animar);
    };

    const iniciar = () => {
      if (!visivel || parado || animacao) return;
      ultimoTempo = 0;
      animacao = window.requestAnimationFrame(animar);
    };

    const ajustarCanvas = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * escala);
      canvas.height = Math.round(height * escala);
      desenharQuadro(quadroAtual);
    };

    const redimensionar = () => {
      if (larguraJanela === window.innerWidth) return;
      larguraJanela = window.innerWidth;
      ajustarCanvas();
    };

    const preferenciaMovimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ajustarCanvas();
    carregarQuadro(0, () => {
      desenhar(quadros[0]);
      carregarQuadro(TOTAL_DE_QUADROS - 1);
      fila.push([0, TOTAL_DE_QUADROS - 1]);
      processarFila();
      if (!preferenciaMovimentoReduzido) iniciar();
    });

    const observador = new IntersectionObserver(([entrada]) => {
      visivel = entrada.isIntersecting;
      if (visivel && !preferenciaMovimentoReduzido) iniciar();
      else {
        window.cancelAnimationFrame(animacao);
        animacao = 0;
      }
    }, { threshold: 0 });
    observador.observe(section);
    window.addEventListener('resize', redimensionar);

    return () => {
      parado = true;
      window.cancelAnimationFrame(animacao);
      observador.disconnect();
      window.removeEventListener('resize', redimensionar);
      fila.length = 0;
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
