'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button, ButtonLink, Notice } from '@notaa/ui';
import { TelaDeEstado } from './components/TelaDeEstado';

/** Erro de renderização em qualquer rota. Não mostra a mensagem técnica; o `digest` ajuda a achar o registro. */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app] erro de renderização', error);
  }, [error]);

  return (
    <TelaDeEstado
      titulo="Algo deu errado"
      acoes={
        <>
          <Button variant="primary" onClick={reset}>
            Tentar de novo
          </Button>
          <ButtonLink as={Link} href="/" variant="secondary">
            Ir para o início
          </ButtonLink>
        </>
      }
    >
      <Notice tone="danger" title="Não foi possível abrir esta tela">
        Tente de novo. Se o problema continuar, volte ao início e abra a tela outra vez.
        {error.digest ? <span className="mt-2 block text-caption text-ink-muted">Código do erro: {error.digest}</span> : null}
      </Notice>
    </TelaDeEstado>
  );
}
