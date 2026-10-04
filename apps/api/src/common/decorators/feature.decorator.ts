import { SetMetadata } from '@nestjs/common';
import type { Feature } from '../feature-flags';

// @RequiresFeature('arena') oculta a rota enquanto a funcionalidade estiver
// desligada (common/feature-flags.ts): o FeatureGuard responde 404, como se a
// rota não existisse. Nada é removido do código nem de ROUTE_ROLES — a rota
// volta ao ar ligando a variável de ambiente.
export const FEATURE_KEY = 'feature';
export const RequiresFeature = (feature: Feature) => SetMetadata(FEATURE_KEY, feature);
