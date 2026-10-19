import * as React from 'react';
import { cn } from '../lib/cn';
import { StatusIcon, type StatusIconTone } from './StatusIcon';

export type StatusTone = StatusIconTone;

export interface NoticeProps {
  tone?: StatusTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const tons: Record<StatusTone, { fundo: string; icone: string }> = {
  info: { fundo: 'bg-cyan-tint', icone: 'text-info' },
  success: { fundo: 'bg-success-tint', icone: 'text-success' },
  warning: { fundo: 'bg-warning-tint', icone: 'text-warning' },
  danger: { fundo: 'bg-danger-tint', icone: 'text-danger' },
};

/** Aviso em linha. Erro anuncia na hora (role="alert"); os demais esperam a vez (role="status"). */
export function Notice({ tone = 'info', title, children, action, className }: NoticeProps) {
  const t = tons[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex max-w-[640px] gap-3 rounded-md p-4 font-text text-body-sm text-ink', t.fundo, className)}
    >
      <StatusIcon tone={tone} className={cn('mt-px h-5 w-5 flex-none', t.icone)} />
      <div>
        {title ? <strong className="block font-bold">{title}</strong> : null}
        {children}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
