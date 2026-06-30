// @notaa/ui — biblioteca de primitivos do design system (docs/07-design-system.md).
//
// Tokens CSS (docs/07) vivem em ./tokens/index.css — importar uma única vez na
// raiz do app (apps/web), nunca redefinir tokens em componentes. Os componentes
// abaixo consomem SOMENTE classes Tailwind mapeadas para esses tokens.
export const TOKENS_CSS_PATH = './tokens/index.css';

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
