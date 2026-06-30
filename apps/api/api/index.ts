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
    
    app.enableCors({
      origin: (origin, callback) => {
        // Permite requisições sem origem (como do próprio servidor SSR), domínios oficiais, localhost, e os previews genéricos da Vercel
        if (!origin || /notaa\.com\.br$/.test(origin) || /localhost:3000$/.test(origin) || /\.vercel\.app$/.test(origin)) {
          callback(null, true);
        } else {
          callback(null, false); // Não bloqueamos com erro para evitar crash, apenas enviamos headers CORS restritos
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
