'use client';

import { Palco, type PalcoProps } from './Palco';

// Um palco por cena. Cada `import()` abaixo vira um chunk próprio, pedido só quando o gate libera o 3D:
// `three` nunca entra no JS inicial de nenhuma rota.
type Props = Omit<PalcoProps, 'carregar'>;

export const PalcoHome = (p: Props) => <Palco carregar={() => import('../cenas/home')} {...p} />;
export const PalcoAluno = (p: Props) => <Palco carregar={() => import('../cenas/aluno')} {...p} />;
