// @notaa/ui — biblioteca de componentes do design system Nota A (docs/07-design-system.md).
//
// Os tokens vivem em tokens/tokens.json e são gerados em ./tokens/tokens.css
// (pnpm --filter @notaa/ui tokens). O app importa tokens.css e base.css uma única
// vez na raiz e usa tailwind.preset.js; nunca redefina tokens em componentes.
// Os componentes consomem SOMENTE classes Tailwind mapeadas para esses tokens.
export { corDoToken } from './tokens/cores';
export type { Tema } from './tokens/cores';

// Util de classes (estilo clsx, sem dependência externa).
export { cn } from './lib/cn';
export type { ClassValue } from './lib/cn';

// Primitivos.
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card';
export type { CardProps } from './components/Card';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeVariant } from './components/Badge';

export { Progress } from './components/Progress';
export type { ProgressProps } from './components/Progress';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Label } from './components/Label';

export { Switch } from './components/Switch';
export type { SwitchProps } from './components/Switch';

export { Chip } from './components/Chip';
export type { ChipProps } from './components/Chip';

export { OptionCard } from './components/OptionCard';
export type { OptionCardProps, OptionCardState } from './components/OptionCard';

export { Stat } from './components/Stat';
export type { StatProps } from './components/Stat';

export { SectionHeader } from './components/SectionHeader';
export type { SectionHeaderProps } from './components/SectionHeader';

export { Skeleton } from './components/Skeleton';

export { Select } from './components/Select';
export type { SelectProps } from './components/Select';

export { Stepper } from './components/Stepper';
export type { StepperProps } from './components/Stepper';

export { Table } from './components/Table';
export type { TableProps } from './components/Table';

export { FileDrop } from './components/FileDrop';
export type { FileDropProps } from './components/FileDrop';
