// Caixa recuada: área em surface-sunken dentro de um painel ou seção (a conta do simulador, uma dica).
// `tom="violet"` troca o fundo pelo tint da marca, para uma dica que merece destaque.
import * as React from 'react';
import { cn } from '../lib/cn';

export interface InsetProps extends React.HTMLAttributes<HTMLDivElement> {
  tom?: 'sunken' | 'violet';
}

export function Inset({ tom = 'sunken', className, ...props }: InsetProps) {
  return (
    <div
      className={cn('rounded-md p-space-4', tom === 'violet' ? 'bg-violet-tint' : 'bg-surface-sunken', className)}
      {...props}
    />
  );
}
