// Contrato entre o Palco (carrega e controla) e as cenas 3D (desenham). As cenas importam `three`;
// este arquivo não, então o Palco o usa sem puxar o three para o JS da rota.

export interface ContextoCena {
  /** Lê um token de cor da paleta do ambiente (ex.: 'amb-accent', 'brand-violet') como o navegador o resolveu. */
  cor(nome: string): string;
  /** Pilha de fontes já resolvida (Sora e Atkinson), para o texto desenhado nas texturas. */
  fontes: { display: string; texto: string };
  /** A cena chama isto se perder o contexto WebGL; o Palco destrói a cena e volta ao fallback estático. */
  aoFalhar(): void;
}

export interface Cena {
  pausar(): void;
  retomar(): void;
  destruir(): void;
}

export interface ModuloCena {
  /**
   * `alvo` é onde o canvas entra; `raiz` é o palco inteiro (ponteiro e âncoras de texto em HTML).
   * Pode devolver a cena depois de uma etapa assíncrona (carregar textura).
   */
  montar(alvo: HTMLElement, raiz: HTMLElement, ctx: ContextoCena): Cena | Promise<Cena>;
}
