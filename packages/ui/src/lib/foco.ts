// Anel de foco do teclado: 2px sólidos com 2px de folga, na cor `focus` (3:1 em todas as superfícies).
// base.css já aplica o mesmo a :focus-visible; a classe garante o anel em quem o app reseta.
export const FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// Resposta a uma ação: `ease-out` é a curva do token --ease-out (tailwind.preset.js), não a padrão do Tailwind.
// As durações vêm de duration-fast|base|slow.
export const EASE_OUT = 'ease-out';
