import { Global, Module } from '@nestjs/common';
import { createDbClient } from '@notaa/db';
import { DB_CLIENT } from './db.tokens';

// Módulo global (doc 03 §3): único lugar da API que importa @notaa/db com a
// connection string (service role). Os adaptadores de cada módulo (quiz,
// gamificacao, profiler...) injetam DB_CLIENT, nunca leem DATABASE_URL direto.
@Global()
@Module({
  providers: [
    {
      provide: DB_CLIENT,
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error('DATABASE_URL não configurado no ambiente da API.');
        }
        return createDbClient(databaseUrl);
      },
    },
  ],
  exports: [DB_CLIENT],
})
export class DbModule {}
