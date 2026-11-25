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

// Componentes do Nota A (espelham o bundle do handoff; props de index.d.ts).
export { Button, classesDoBotao } from './components/formularios/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/formularios/Button';
export { ButtonLink } from './components/formularios/ButtonLink';
export type { ButtonLinkProps } from './components/formularios/ButtonLink';
export { TextField } from './components/formularios/TextField';
export type { TextFieldProps } from './components/formularios/TextField';
export { TextArea } from './components/formularios/TextArea';
export type { TextAreaProps } from './components/formularios/TextArea';
export { Select } from './components/formularios/Select';
export type { SelectProps } from './components/formularios/Select';
export { Chip } from './components/feedback/Chip';
export type { ChipProps, Tone } from './components/feedback/Chip';
export { ChoiceChip } from './components/formularios/ChoiceChip';
export type { ChoiceChipProps } from './components/formularios/ChoiceChip';
export { Tabs, propsDoPainel } from './components/navegacao/Tabs';
export type { TabsProps } from './components/navegacao/Tabs';
export { SideNav } from './components/navegacao/SideNav';
export type { SideNavProps, SideNavItem } from './components/navegacao/SideNav';
export { BottomNav } from './components/navegacao/BottomNav';
export type { BottomNavProps, BottomNavItem } from './components/navegacao/BottomNav';
export { ProgressTrail } from './components/navegacao/ProgressTrail';
export type { ProgressTrailProps } from './components/navegacao/ProgressTrail';
export { Notice } from './components/feedback/Notice';
export type { NoticeProps, StatusTone } from './components/feedback/Notice';
export { EmptyState } from './components/feedback/EmptyState';
export type { EmptyStateProps } from './components/feedback/EmptyState';
export { Aurora } from './components/marca/Aurora';
export type { AuroraProps } from './components/marca/Aurora';
export { NotaASimbolo } from './components/marca/NotaASimbolo';
export type { NotaASimboloProps } from './components/marca/NotaASimbolo';
export { Dialog } from './components/feedback/Dialog';
export type { DialogProps } from './components/feedback/Dialog';
export { Toaster, toast, dismiss } from './components/feedback/Toast';
export type { ToastVariant } from './components/feedback/Toast';
export { Menu } from './components/navegacao/Menu';
export type { MenuProps, MenuItem } from './components/navegacao/Menu';

// Estrutura de página leve: seções separadas por espaço e linha fina; painel só para formulário ou tabela.
export { Section } from './components/estrutura/Section';
export type { SectionProps } from './components/estrutura/Section';
export { Panel } from './components/estrutura/Panel';
export type { PanelProps } from './components/estrutura/Panel';
export { PageHeader } from './components/estrutura/PageHeader';
export type { PageHeaderProps } from './components/estrutura/PageHeader';
export { ActionRow } from './components/estrutura/ActionRow';
export type { ActionRowProps } from './components/estrutura/ActionRow';
export { SummaryStrip } from './components/estrutura/SummaryStrip';
export type { SummaryStripProps, SummaryItem } from './components/estrutura/SummaryStrip';
export { Inset } from './components/estrutura/Inset';
export type { InsetProps } from './components/estrutura/Inset';
export { ThemeSwitch } from './components/navegacao/ThemeSwitch';
export type { ThemeSwitchProps, PreferenciaDeTema } from './components/navegacao/ThemeSwitch';

// Navegação e atalhos do aplicativo para computador.
export { AppFrame } from './components/estrutura/AppFrame';
export type { AppFrameProps } from './components/estrutura/AppFrame';
export { TopBar } from './components/navegacao/TopBar';
export type { TopBarProps } from './components/navegacao/TopBar';
export { CommandPalette } from './components/navegacao/CommandPalette';
export type { CommandPaletteProps, ComandoItem } from './components/navegacao/CommandPalette';
export { ShortcutsDialog } from './components/navegacao/ShortcutsDialog';
export type { ShortcutsDialogProps, GrupoDeAtalhos } from './components/navegacao/ShortcutsDialog';
export { useAtalhos, teclaModificadora } from './lib/atalhos';
export type { Atalho } from './lib/atalhos';

// Primitivos anteriores, ainda em uso nas telas de aluno e família.

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card';
export type { CardProps } from './components/Card';

export { Progress } from './components/feedback/Progress';
export type { ProgressProps } from './components/feedback/Progress';

export { Input } from './components/formularios/Input';
export type { InputProps } from './components/formularios/Input';

export { Switch } from './components/formularios/Switch';
export type { SwitchProps } from './components/formularios/Switch';

export { OptionCard } from './components/formularios/OptionCard';
export type { OptionCardProps, OptionCardState } from './components/formularios/OptionCard';

export { Skeleton, SkeletonText, SkeletonLinhas, Carregando } from './components/feedback/Skeleton';

export { Stepper } from './components/navegacao/Stepper';
export type { StepperProps } from './components/navegacao/Stepper';

export { Table } from './components/estrutura/Table';
export type { TableProps } from './components/estrutura/Table';

export { FileDrop } from './components/formularios/FileDrop';
export type { FileDropProps } from './components/formularios/FileDrop';
