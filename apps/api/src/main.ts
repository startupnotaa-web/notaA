import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  
  // Middleware global de log de CORS e Requisições
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;
    if (origin) {
      console.log(`[CORS Log] Method: ${request.method} | URL: ${request.url} | Origin: ${origin}`);
    }
    done();
  });

  app.enableCors({
    origin: [
      'https://notaa.com.br',
      'https://www.notaa.com.br',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-development-mode', 'Accept', 'idempotency-key', 'Idempotency-Key'],
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API (Orquestração) ouvindo em http://localhost:${port}`);
}

bootstrap();
