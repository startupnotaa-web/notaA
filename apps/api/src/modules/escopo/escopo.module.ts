import { Module } from '@nestjs/common';
import { EscopoService } from './escopo.service';

/**
 * Escopo de autorização, compartilhado. Quem lida com instituição, turma ou
 * dado de aluno de terceiro importa este módulo em vez de reimplementar a
 * regra — é o que mantém a janela de dados com uma única definição.
 *
 * Não tem controller de propósito: não existe rota de "escopo", existe escopo
 * aplicado às rotas dos outros módulos.
 */
@Module({
  providers: [EscopoService],
  exports: [EscopoService],
})
export class EscopoModule {}
