import { cn } from '@notaa/ui';

/**
 * Marca um trecho cujo fato o repositório não sustenta hoje (recurso que não está no produto, promessa
 * comercial, prazo). Fica visível de propósito, para sair um a um quando alguém confirmar. `nota` diz o quê.
 */
export function Confirmar({ nota, className }: { nota: string; className?: string }) {
  return (
    <span
      title={nota}
      className={cn(
        'ml-2 inline-flex items-center rounded-sm border border-dashed border-warning bg-warning-tint px-2 font-text text-caption font-bold text-warning',
        className,
      )}
    >
      [CONFIRMAR<span className="sr-only">: {nota}</span>]
    </span>
  );
}

/** Informação que ainda não existe e que não cabe inventar (prazo, valor, razão social). */
export function Placeholder({ nota, className }: { nota: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border border-dashed border-warning bg-warning-tint px-2 font-text font-bold text-warning',
        className,
      )}
    >
      [PLACEHOLDER: {nota}]
    </span>
  );
}
