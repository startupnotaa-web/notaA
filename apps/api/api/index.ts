import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import serverless from 'serverless-http';
import { AppModule } from '../src/app.module';

let handler: any;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  
  // Middleware global de log de CORS e Requisições
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request: any, reply: any, done: any) => {
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-development-mode', 'Accept'],
    credentials: true,
  });

  await app.init();
  
  // O serverless-http empacota a instância raw do Fastify para lidar com (req, res) da Vercel Node Runtime
  return serverless(fastify as any);
}

// O @vercel/node suporta AWS Lambda Signature e HTTP signature
export default async function (req: any, res: any) {
  if (!handler) {
    handler = await bootstrap();
  }
  return handler(req, res);
}
