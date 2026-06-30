import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

// Concretiza doc 05 §1: "Todos os payloads são validados por Zod". Falha de
// validação = VALIDATION_ERROR (422 conceitual; Nest mapeia BadRequestException
// para 400 — ver TODO no filtro de exceção global de doc 05 quando for criado).
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload inválido.',
          details: result.error.flatten(),
        },
      });
    }
    return result.data;
  }
}
