import type { ReactNode } from 'react';

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição.
export const dynamic = 'force-dynamic';

export default function LayoutDaEscola({ children }: { children: ReactNode }) {
  return (
    <div data-ambiente="escola" data-theme="light" className="min-h-screen overflow-x-clip bg-amb-bg font-text text-amb-ink">
      {children}
    </div>
  );
}
