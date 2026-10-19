// Caixa recuada: área em surface-sunken dentro de um painel ou seção (a conta do simulador, uma dica).
import * as React from 'react';
import { cn } from '../lib/cn';

export function Inset({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md bg-surface-sunken p-space-4', className)} {...props} />;
}
