'use client';
import { Notice } from '@notaa/ui';
import { useOnline } from '../../lib/use-online';

/** Aviso de conexão perdida. Some sozinho quando a internet volta; não ocupa espaço enquanto há conexão. */
export function AvisoOffline({ className }: { className?: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <div className={className}>
      <Notice tone="warning" title="Você está sem conexão">
        O que você já abriu continua disponível. Salvar e enviar voltam a funcionar quando a internet voltar.
      </Notice>
    </div>
  );
}
