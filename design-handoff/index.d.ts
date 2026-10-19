import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, CSSProperties, ElementType } from "react";

export type Tone = "neutral" | "brand" | "info" | "success" | "warning" | "danger";
export type StatusTone = "info" | "success" | "warning" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Ação principal (uma por área), secundária, discreta ou destrutiva. */
  variant?: "primary" | "secondary" | "quiet" | "danger";
  /** md = 44px (padrão, alvo de toque); sm = 36px (barras de ferramentas). */
  size?: "md" | "sm";
  /** Desabilita e mostra o indicador de carregamento. */
  loading?: boolean;
  children: ReactNode;
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: ReactNode;
  /** Substitui a dica e marca o campo como inválido. */
  error?: ReactNode;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  options: { value: string; label: string }[];
  hint?: ReactNode;
  error?: ReactNode;
}

export interface ChipProps {
  tone?: Tone;
  children: ReactNode;
}

export interface TabsProps {
  tabs: { id: string; label: ReactNode; count?: number }[];
  /** Nome acessível do grupo de abas. */
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
}

export interface SideNavProps {
  /** Itens de navegação; um item { group } vira título de grupo. */
  items: ({ id: string; label: ReactNode; href?: string; badge?: ReactNode } | { group: string })[];
  current?: string;
  /** URL do símbolo (nota-a-simbolo.svg), mostrado a 24px ao lado do nome. */
  logo?: string;
  brand?: ReactNode;
  label?: string;
}

export interface GradeGridProps {
  columns: { id: string; label: string; weight?: number }[];
  rows: { id: string; name: string; grades: Record<string, number | string> }[];
  min?: number;
  max?: number;
  /** Média mínima de aprovação; abaixo dela a média aparece em danger com texto. */
  passing?: number;
  caption?: ReactNode;
  nameLabel?: string;
  averageLabel?: string;
  onChange?: (rowId: string, columnId: string, value: string) => void;
}

export interface ProgressTrailProps {
  total: number;
  done: number;
  /** Nome acessível da barra de progresso. */
  label: string;
  caption?: ReactNode;
}

export interface NoticeProps {
  tone?: StatusTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

export interface EmptyStateProps {
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

export interface AuroraProps {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export declare function Button(props: ButtonProps): JSX.Element;
export declare function TextField(props: TextFieldProps): JSX.Element;
export declare function Select(props: SelectProps): JSX.Element;
export declare function Chip(props: ChipProps): JSX.Element;
export declare function Tabs(props: TabsProps): JSX.Element;
export declare function SideNav(props: SideNavProps): JSX.Element;
export declare function GradeGrid(props: GradeGridProps): JSX.Element;
export declare function ProgressTrail(props: ProgressTrailProps): JSX.Element;
export declare function Notice(props: NoticeProps): JSX.Element;
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
export declare function Aurora(props: AuroraProps): JSX.Element;
