import { SetMetadata } from '@nestjs/common';

// Marca uma rota como pública (sem JWT) — ex.: /auth/register, /health.
// Doc 10 §7: default-deny — toda rota SEM @Public() exige token válido.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
