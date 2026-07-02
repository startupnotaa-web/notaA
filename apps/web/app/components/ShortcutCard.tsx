import Link from 'next/link';
import { Badge, cn } from '@notaa/ui';

export function ShortcutCard({
  icon,
  title,
  description,
  metric,
  href,
  emBreve = false,
}: {
  icon: string;
  title: string;
  description: string;
  metric?: string;
  href?: string;
  emBreve?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        'group flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-md transition-all',
        href && !emBreve && 'hover:border-brand-primary/50 hover:bg-surface-2 hover:shadow-[0_4px_15px_rgba(38,153,233,0.1)] hover:-translate-y-0.5',
        emBreve && 'opacity-60 grayscale-[50%]',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl" aria-hidden="true">
          {icon}
        </span>
        {emBreve ? (
          <Badge variant="neutral" className="text-[10px]">Em breve</Badge>
        ) : (
          <span className="text-brand-primary transition-transform group-hover:translate-x-1 font-bold text-lg" aria-hidden="true">
            →
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-text leading-tight">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
      {metric && <p className="mt-auto pt-2 text-[10px] font-bold tracking-wide uppercase text-text-muted">{metric}</p>}
    </div>
  );
  return href && !emBreve ? (
    <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-2xl">
      {inner}
    </Link>
  ) : (
    <div className="block h-full cursor-not-allowed">
      {inner}
    </div>
  );
}
