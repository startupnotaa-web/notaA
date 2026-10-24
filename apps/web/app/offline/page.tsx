'use client';
import { Button } from '@notaa/ui';
import { TelaDeEstado } from '../components/TelaDeEstado';

// Entregue pelo service worker (app/sw.ts) quando uma página não está salva e não há internet.
export default function Offline() {
  return (
    <TelaDeEstado
      titulo="Você está sem conexão"
      acoes={
        <Button variant="primary" onClick={() => window.location.reload()}>
          Tentar de novo
        </Button>
      }
    >
      Esta página ainda não está salva no seu aparelho. Conecte-se à internet para abri-la.
    </TelaDeEstado>
  );
}
