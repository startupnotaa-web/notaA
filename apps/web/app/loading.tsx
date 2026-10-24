import { Carregando, Skeleton, SkeletonText } from '@notaa/ui';

/** Espera genérica entre rotas: o título e algumas linhas, estáticos. Cada tela tem o próprio esqueleto quando carrega dados. */
export default function Carregamento() {
  return (
    <Carregando rotulo="Carregando a página" className="mx-auto flex w-full max-w-3xl flex-col gap-space-6 px-4 py-space-7">
      <Skeleton className="h-9 w-2/3" />
      <SkeletonText linhas={4} />
    </Carregando>
  );
}
