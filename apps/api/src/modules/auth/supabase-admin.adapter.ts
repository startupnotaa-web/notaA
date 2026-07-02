import type { AuthAdminPort } from '@notaa/contracts';
import type { Papel } from '@notaa/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Adaptador real de AuthAdminPort — único ponto que usa a service role do Supabase Auth. */
export class SupabaseAuthAdminAdapter implements AuthAdminPort {
  constructor(private readonly client: SupabaseClient) {}

  async setPapel(authUid: string, papel: Papel, escolaId: string | null): Promise<void> {
    const { error } = await (this.client.auth as any).admin.updateUserById(authUid, {
      app_metadata: { papel, escola_id: escolaId },
    });
    if (error) {
      throw new Error(`Falha ao setar app_metadata.papel no Supabase Auth: ${error.message}`);
    }
  }
}
