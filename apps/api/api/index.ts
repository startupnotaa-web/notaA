import 'reflect-metadata';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { CORS_OPTIONS } from '../src/common/cors';
import { initSentry, SentryExceptionFilter } from '../src/common/sentry';

let app: NestFastifyApplication;

async function bootstrap() {
  if (!app) {
    initSentry();
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter()
    );
    app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

    // Política única em src/common/cors.ts (auditoria E12) — não duplicar aqui.
    app.enableCors(CORS_OPTIONS);

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
