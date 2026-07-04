import 'reflect-metadata';
import 'dotenv/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { CORS_OPTIONS } from './common/cors';
import { initSentry, SentryExceptionFilter } from './common/sentry';

async function bootstrap() {
  initSentry();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
  
  // Middleware global de log de CORS e Requisições
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;
    if (origin) {
      console.log(`[CORS Log] Method: ${request.method} | URL: ${request.url} | Origin: ${origin}`);
    }
    done();
  });

  app.enableCors(CORS_OPTIONS);
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API (Orquestração) ouvindo em http://localhost:${port}`);
}

bootstrap();
