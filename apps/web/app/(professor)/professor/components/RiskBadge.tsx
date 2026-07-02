import { cn } from '@notaa/ui';

type RiskLevel = 'alto' | 'medio' | 'baixo';

export function RiskBadge({ risco, className }: { risco: RiskLevel; className?: string }) {
  const styles = {
    alto: 'bg-error/10 text-error border-error/20',
    medio: 'bg-warning/10 text-warning border-warning/20',
    baixo: 'bg-success/10 text-success border-success/20',
  };

  const labels = {
    alto: 'Alto Risco',
    medio: 'Atenção',
    baixo: 'Bom',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        styles[risco],
        className
      )}
    >
      {labels[risco]}
    </span>
  );
}
