import * as React from 'react';
import { cn } from '../lib/cn';

// Grid de 12 colunas com gutter de 24px (token `gutter`). Abaixo de 768px as colunas empilham (12 de 12).
// Os mapas de classes são literais para o Tailwind encontrá-los.
const MD: Record<number, string> = { 1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4', 5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8', 9: 'md:col-span-9', 10: 'md:col-span-10', 11: 'md:col-span-11', 12: 'md:col-span-12' };
const LG: Record<number, string> = { 1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9', 10: 'lg:col-span-10', 11: 'lg:col-span-11', 12: 'lg:col-span-12' };
const XL: Record<number, string> = { 1: 'xl:col-span-1', 2: 'xl:col-span-2', 3: 'xl:col-span-3', 4: 'xl:col-span-4', 5: 'xl:col-span-5', 6: 'xl:col-span-6', 7: 'xl:col-span-7', 8: 'xl:col-span-8', 9: 'xl:col-span-9', 10: 'xl:col-span-10', 11: 'xl:col-span-11', 12: 'xl:col-span-12' };

export function Grade({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-12 gap-gutter', className)} {...props} />;
}

export interface ColProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Colunas ocupadas (1 a 12) a partir de 768px. Abaixo disso a coluna ocupa a linha toda. */
  md?: number;
  /** A partir de 1.024px. */
  lg?: number;
  /** A partir de 1.280px: aqui entram as 3 zonas. */
  xl?: number;
}

/** Coluna do grid. `min-w-0` deixa tabelas e textos longos encolherem em vez de empurrar a página. */
export function Col({ md, lg, xl, className, ...props }: ColProps) {
  return (
    <div
      className={cn(
        'col-span-12 min-w-0',
        md ? MD[md] : null,
        lg ? LG[lg] : null,
        xl ? XL[xl] : null,
        className,
      )}
      {...props}
    />
  );
}
