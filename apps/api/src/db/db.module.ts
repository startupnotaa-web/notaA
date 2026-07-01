import { Global, Logger, Module } from '@nestjs/common';
import { createDbClient } from '@notaa/db';
import { DB_CLIENT } from './db.tokens';

const logger = new Logger('DbModule');

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
          logger.error('DATABASE_URL não encontrada. As rotas que usam banco falharão com erro 500.');
          // Não lançamos erro síncrono aqui! Se lançarmos, o Vercel Serverless
          // falha no cold start e retorna um 500 opaco, ignorando nosso filtro.
          return createDbClient(undefined);
        }
        
        // Log seguro: mostra apenas host/porta para diagnóstico, nunca a senha.
        try {
          const parsed = new URL(databaseUrl);
          logger.log(`Conectando ao banco: ${parsed.hostname}:${parsed.port || '5432'}/${parsed.pathname.slice(1)}`);
        } catch {
          logger.warn('DATABASE_URL presente mas formato não-parseável como URL — prosseguindo com a string raw.');
        }
        return createDbClient(databaseUrl);
      },
    },
  ],
  exports: [DB_CLIENT],
})
export class DbModule {}

