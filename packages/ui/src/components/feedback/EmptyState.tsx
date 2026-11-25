import * as React from 'react';

export interface EmptyStateProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

/** Estado vazio que convida a agir: diz o que falta e oferece o próximo passo. */
export function EmptyState({ title, children, actions }: EmptyStateProps) {
  const titleId = React.useId();
  return (
    <section aria-labelledby={titleId} className="flex max-w-[420px] flex-col items-start gap-3 py-space-6">
      <svg viewBox="0 0 56 56" aria-hidden="true" className="h-14 w-14">
        <rect
          x={14}
          y={14}
          width={28}
          height={28}
          rx={5}
          transform="rotate(45 28 28)"
          strokeDasharray="4 4"
          className="fill-surface-sunken stroke-line-strong"
        />
      </svg>
      <h3 id={titleId} className="m-0 font-display text-heading-3 text-ink">
        {title}
      </h3>
      {children ? <p className="m-0 font-text text-body text-ink-muted">{children}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}
