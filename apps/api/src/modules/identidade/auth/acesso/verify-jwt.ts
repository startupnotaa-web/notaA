import { jwtVerify, decodeProtectedHeader, createRemoteJWKSet } from 'jose';
import { BootstrapJwtClaimsSchema, JwtClaimsSchema, type BootstrapJwtClaims, type JwtClaims } from '@notaa/contracts';

export class InvalidJwtError extends Error {
  constructor(cause: unknown) {
    super('Token JWT inválido, expirado ou malformado.');
    this.cause = cause;
  }
}

/**
 * Verifica um JWT do Supabase Auth, suportando tanto HS256 quanto ES256/RS256 (JWKS).
 */
export async function verifySupabaseJwt(token: string, jwtSecret: string): Promise<JwtClaims> {
  let payload: unknown;
  try {
    const header = decodeProtectedHeader(token);
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('SUPABASE_URL ausente no ambiente');
    const options = { audience: 'authenticated', issuer: `${supabaseUrl}/auth/v1` };

    let result;
    if (header.alg === 'HS256') {
      const key = new TextEncoder().encode(jwtSecret);
      result = await jwtVerify(token, key, options);
    } else {
      const key = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
      result = await jwtVerify(token, key, options);
    }
    payload = result.payload;
  } catch (cause) {
    console.error('jwtVerify error:', cause);
    throw new InvalidJwtError(cause);
  }

  const parsed = JwtClaimsSchema.safeParse(payload);
  if (!parsed.success) {
    console.error('JwtClaimsSchema validation failed:', parsed.error);
    throw new InvalidJwtError(parsed.error);
  }
  return parsed.data;
}

/**
 * Verificação leve para POST /auth/register (doc 05 §2) — ver BootstrapJwtClaimsSchema.
 * Mesma assinatura/segredo do Supabase Auth, mas SEM exigir app_metadata.papel.
 */
export async function verifySupabaseJwtBootstrap(
  token: string,
  jwtSecret: string,
): Promise<BootstrapJwtClaims> {
  let payload: unknown;
  try {
    const header = decodeProtectedHeader(token);
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('SUPABASE_URL ausente no ambiente');
    const options = { audience: 'authenticated', issuer: `${supabaseUrl}/auth/v1` };

    let result;
    if (header.alg === 'HS256') {
      const key = new TextEncoder().encode(jwtSecret);
      result = await jwtVerify(token, key, options);
    } else {
      const key = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
      result = await jwtVerify(token, key, options);
    }
    payload = result.payload;
  } catch (cause) {
    throw new InvalidJwtError(cause);
  }

  const parsed = BootstrapJwtClaimsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InvalidJwtError(parsed.error);
  }
  return parsed.data;
}
