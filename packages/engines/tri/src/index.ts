import type { MotorTRI } from '@notaa/contracts';
import { probabilidadeAcerto } from './model';
import { selectNextItem } from './select-next-item';
import { updateAbility } from './update-ability';

export { probabilidadeAcerto, informacaoFisher, clampTheta, THETA_MIN, THETA_MAX } from './model';
export { updateAbility } from './update-ability';
export { selectNextItem, PoolEsgotadoError } from './select-next-item';

/**
 * Implementação concreta de MotorTRI (doc 05 §9) — TS puro, sem framework,
 * DB ou SDK de IA (doc 03 §2/§6). Consumida pela API/Worker via injeção;
 * nunca importada diretamente por apps/web (regra de fronteira, doc 09 §2).
 */
export const motorTRI: MotorTRI = {
  selectNextItem,
  updateAbility,
  probabilidadeAcerto,
};
