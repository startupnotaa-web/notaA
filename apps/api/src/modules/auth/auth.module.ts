import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { UsuarioRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';
import { SupabaseAuthAdminAdapter } from './supabase-admin.adapter';
import { AUTH_ADMIN, USUARIO_REPOSITORY } from './auth.tokens';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    {
      provide: USUARIO_REPOSITORY,
      inject: [DB_CLIENT],
      useFactory: (db: Database) => new UsuarioRepositoryDb(db),
    },
    {
      // Service role — só esta API escreve app_metadata.papel (doc 03 §9).
      // NUNCA exportado/usado pelo apps/web (que só tem a anon key pública).
      provide: AUTH_ADMIN,
      useFactory: () => {
        const url = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceRoleKey) {
          throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente da API.');
        }
        const client = createClient(url, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        return new SupabaseAuthAdminAdapter(client);
      },
    },
  ],
})
export class AuthModule {}
