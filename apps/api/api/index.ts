import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';

let app: NestFastifyApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter()
    );
    
    // Origens oficiais explícitas (inclui https://notaa.com.br). Mantemos os
    // previews da Vercel via regex ANCORADA (`^…$`) — a versão antiga
    // (`/\.vercel\.app$/`, `/notaa\.com\.br$/`) era frouxa e casava domínios
    // como `xnotaa.com.br`. localhost:3000 só vale em dev.
    const ALLOWED_ORIGINS = [
      'https://notaa.com.br',
      'https://www.notaa.com.br',
      'http://localhost:3000',
    ];

    app.enableCors({
      origin: (origin, callback) => {
        // Sem origem (SSR/curl), domínio oficial explícito, ou preview da Vercel.
        if (
          !origin ||
          ALLOWED_ORIGINS.includes(origin) ||
          /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
        ) {
          callback(null, true);
        } else {
          callback(null, false); // Não bloqueamos com erro para evitar crash, apenas enviamos headers CORS restritos
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-development-mode', 'Accept'],
      credentials: true,
    });

    await app.init();
    
    const instance = app.getHttpAdapter().getInstance();
    await instance.ready(); // Fastify exige o .ready() para compilar as rotas internas!
  }
}

export default async function (req: any, res: any) {
  await bootstrap();
  const instance = app.getHttpAdapter().getInstance();
  // O Vercel Node Runtime fornece (req, res) nativos do Node HTTP.
  // Fastify os intercepta emitindo um evento 'request' direto no servidor base.
  instance.server.emit('request', req, res);
}
