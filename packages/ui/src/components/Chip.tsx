import * as React from 'react';
import { cn } from '../lib/cn';
import { StatusIcon, type StatusIconTone } from './StatusIcon';

export type Tone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

export interface ChipProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

const tons: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink',
  brand: 'bg-violet-tint text-primary',
  info: 'bg-cyan-tint text-info',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
};

const comIcone = (tone: Tone): tone is StatusIconTone =>
  tone === 'info' || tone === 'success' || tone === 'warning' || tone === 'danger';

/** Etiqueta de status. Os tons de status levam ícone; a palavra do filho sempre diz o estado. */
export function Chip({ tone = 'neutral', children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1 whitespace-nowrap rounded-pill px-3 font-text text-[13px] font-bold leading-[18px]',
        tons[tone],
        className,
      )}
    >
      {comIcone(tone) ? <StatusIcon tone={tone} className="h-3.5 w-3.5 flex-none" /> : null}
      {children}
    </span>
  );
}
