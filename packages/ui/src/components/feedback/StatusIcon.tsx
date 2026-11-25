import * as React from 'react';

export type StatusIconTone = 'info' | 'success' | 'warning' | 'danger';

// Os quatro glifos de status do Nota A: traço de 2px, desenhados no estilo do Lucide.
const CAMINHOS: Record<StatusIconTone, string[]> = {
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-5', 'M12 8h.01'],
  success: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M8 12.5l2.7 2.7L16 9.8'],
  warning: [
    'M10.3 3.9L1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    'M12 9v4',
    'M12 17h.01',
  ],
  danger: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M15 9l-6 6', 'M9 9l6 6'],
};

/** Ícone decorativo: o significado vem sempre do texto ao lado. */
export function StatusIcon({ tone, className }: { tone: StatusIconTone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {CAMINHOS[tone].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
