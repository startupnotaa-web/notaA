import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { ClassService } from './class.service';
import type { ClassAnalyticsResponse } from '@notaa/contracts';
import { RequireAuth } from '../auth/require-auth.decorator';

@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('analytics')
  @RequireAuth()
  async getAnalytics(@Req() req: any): Promise<ClassAnalyticsResponse> {
    const userId = req.user.sub;
    const role = req.user.tipoPerfil;
    
    // Garantir que é um professor
    if (role !== 'professor' && role !== 'admin') {
      throw new UnauthorizedException('Acesso negado. Apenas professores podem acessar esta rota.');
    }

    return this.classService.getAnalytics(userId);
  }
}
