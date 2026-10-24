import * as React from 'react';
import { cn } from '../lib/cn';
import { classesDoBotao, type ButtonSize, type ButtonVariant } from './Button';

type Propios<T extends React.ElementType> = {
  /** Elemento ou componente de link (ex.: `next/link`). Padrão: `<a>`. */
  as?: T;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

export type ButtonLinkProps<T extends React.ElementType = 'a'> = Propios<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof Propios<T>>;

/** Link com a aparência de Button. Navega, então é `<a>`: nunca coloque um Button dentro de um link. */
export function ButtonLink<T extends React.ElementType = 'a'>({
  as,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonLinkProps<T>) {
  const Tag: React.ElementType = as ?? 'a';
  return (
    <Tag className={cn(classesDoBotao(variant, size), className)} {...props}>
      {children}
    </Tag>
  );
}
