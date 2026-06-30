import { Module } from '@nestjs/common';
import { EscolaController } from './escola.controller';

@Module({ controllers: [EscolaController] })
export class EscolaModule {}
