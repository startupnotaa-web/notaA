import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { InvalidJwtError, verifySupabaseJwt, verifySupabaseJwtBootstrap } from '../verify-jwt';

const SECRET = 'segredo-de-teste-com-pelo-menos-32-bytes-de-tamanho';
const SUB = '11111111-1111-1111-1111-111111111111';

async function signToken(overrides: Record<string, unknown> = {}, secret = SECRET) {
  const secretKey = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: SUB,
    email: 'aluna@example.com',
    app_metadata: { papel: 'estudante', escola_id: null },
    iat: now,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

describe('verifySupabaseJwt (I1/doc 03 §9 — único verificador de token)', () => {
  it('aceita um token válido e retorna os claims tipados', async () => {
    const token = await signToken();
    const claims = await verifySupabaseJwt(token, SECRET);
    expect(claims.sub).toBe(SUB);
    expect(claims.app_metadata.papel).toBe('estudante');
  });

  it('rejeita token assinado com segredo diferente', async () => {
    const token = await signToken({}, 'outro-segredo-completamente-diferente-32bytes');
    await expect(verifySupabaseJwt(token, SECRET)).rejects.toBeInstanceOf(InvalidJwtError);
  });

  it('rejeita token expirado', async () => {
    const secretKey = new TextEncoder().encode(SECRET);
    const past = Math.floor(Date.now() / 1000) - 7200;
    const expired = await new SignJWT({
      sub: SUB,
      app_metadata: { papel: 'estudante' },
      iat: past,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(past + 60)
      .sign(secretKey);

    await expect(verifySupabaseJwt(expired, SECRET)).rejects.toBeInstanceOf(InvalidJwtError);
  });

  it('rejeita token com papel fora do enum (claim malformado — I6/RBAC não pode confiar em dado solto)', async () => {
    const token = await signToken({ app_metadata: { papel: 'super_admin_hacker' } });
    await expect(verifySupabaseJwt(token, SECRET)).rejects.toBeInstanceOf(InvalidJwtError);
  });

  it('rejeita token sem sub (uuid) válido', async () => {
    const token = await signToken({ sub: 'nao-e-um-uuid' });
    await expect(verifySupabaseJwt(token, SECRET)).rejects.toBeInstanceOf(InvalidJwtError);
  });
});

describe('verifySupabaseJwtBootstrap (POST /auth/register — sem app_metadata.papel ainda)', () => {
  it('aceita um token SEM app_metadata (usuário recém-criado via signUp, antes do papel existir)', async () => {
    const secretKey = new TextEncoder().encode(SECRET);
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ sub: SUB, email: 'nova@example.com', iat: now })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(now + 3600)
      .sign(secretKey);

    const claims = await verifySupabaseJwtBootstrap(token, SECRET);
    expect(claims.sub).toBe(SUB);
    expect(claims.email).toBe('nova@example.com');
  });

  it('ainda rejeita assinatura inválida ou token expirado', async () => {
    const token = await signToken({}, 'outro-segredo-completamente-diferente-32bytes');
    await expect(verifySupabaseJwtBootstrap(token, SECRET)).rejects.toBeInstanceOf(InvalidJwtError);
  });
});
