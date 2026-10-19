import { Carregando, NotaASimbolo } from '@notaa/ui';

/** Tela cheia de espera (sessão sendo verificada). Estática: nada se move sozinho. */
export function TelaCarregando({ rotulo = 'Carregando' }: { rotulo?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Carregando rotulo={rotulo} className="flex flex-col items-center gap-space-4">
        <NotaASimbolo className="h-8 w-auto" />
        <p aria-hidden="true" className="m-0 text-body text-ink-muted">
          {rotulo}…
        </p>
      </Carregando>
    </main>
  );
}
