import * as React from 'react';

export interface NotaASimboloProps {
  className?: string;
  /** Nome acessível. Sem ele o símbolo é decorativo (aria-hidden), o normal ao lado do nome "Nota A". */
  titulo?: string;
}

// Caminhos de assets/nota-a-simbolo.svg (arquivo-fonte da marca). As cores vêm dos tokens da marca,
// então o símbolo não repete nenhum hexadecimal e vale sobre paper e sobre o índigo do tema escuro.
const BORLA =
  'M1062.0,436.0L1062.2,682.5L1060.2,686.2L1055.2,690.8L1052.2,698.5L1051.8,759.5L1052.5,764.2L1054.2,765.8L1082.0,765.8L1085.0,762.0L1084.8,700.0L1082.0,690.5L1076.8,686.2L1075.0,683.0L1075.0,436.0Z';
const CORPO =
  'M441.5,635.5L426.2,626.8L350.5,589.5L345.8,590.5L338.2,603.5L292.5,703.2L264.8,761.5L264.5,765.5L269.0,766.8L338.2,767.0L376.0,766.8L381.0,765.8L386.0,759.2L441.2,641.2L442.2,638.2ZM772.8,634.5L771.5,636.5L772.5,641.2L777.8,650.8L827.5,758.8L832.8,765.0L840.2,767.0L948.8,767.2L950.8,766.2L950.5,763.0L943.2,746.5L938.2,737.8L875.8,602.5L869.0,590.5L866.2,589.0L863.5,589.0L856.8,591.8ZM29.0,382.8L30.8,385.8L351.2,545.2L594.5,667.8L607.0,672.2L614.0,670.2L644.2,655.8L1187.8,383.8L819.2,198.5L727.8,154.0L704.5,141.2L703.2,141.2L705.5,148.5L717.2,170.2L723.8,187.0L735.2,209.8L770.5,287.2L777.8,298.8L783.8,303.5L931.0,376.8L940.2,382.5L940.2,384.0L938.0,386.2L686.8,511.8L627.0,542.5L607.5,551.2L603.5,550.5L282.8,390.2L272.8,383.8L274.0,381.2L424.8,306.2L437.0,298.2L447.2,279.2L498.0,168.5L510.8,143.0L510.5,141.2L123.0,335.5L35.2,378.5ZM606.5,28.2L427.5,412.2L426.5,417.2L429.8,420.0L515.5,463.0L520.5,464.8L523.2,464.2L604.2,291.0L607.0,288.2L611.5,294.5L614.8,303.2L686.5,456.2L690.8,463.2L695.5,464.2L785.0,420.0L787.8,418.0L788.0,416.2L640.2,97.8L627.8,73.0L609.2,30.5Z';

/**
 * Símbolo do Nota A: um "A" feito de capelo de formatura, em gradiente cyan, violeta e magenta, com a borla em azul.
 * Proporção 1,5:1; altura mínima de 20px na tela. Use h-6 (24px) ao lado do nome na SideNav.
 */
export function NotaASimbolo({ className, titulo }: NotaASimboloProps) {
  // O gradiente usa userSpaceOnUse; um id próprio evita colisão quando o símbolo aparece duas vezes.
  const gradiente = `${React.useId()}-nota-a`;
  return (
    <svg
      viewBox="0 0 1214 796"
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradiente} gradientUnits="userSpaceOnUse" x1="30.4" y1="0" x2="1179.4" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--brand-cyan)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--brand-violet)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brand-magenta)' }} />
        </linearGradient>
      </defs>
      <path style={{ fill: 'var(--brand-blue)' }} d={BORLA} />
      <path fill={`url(#${gradiente})`} fillRule="evenodd" d={CORPO} />
    </svg>
  );
}
