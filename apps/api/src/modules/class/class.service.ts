import { Injectable } from '@nestjs/common';
import { ClassRepository } from './class.repository.drizzle';
import type { ClassAnalyticsResponse } from '@notaa/contracts';

@Injectable()
export class ClassService {
  constructor(private readonly repo: ClassRepository) {}

  async getAnalytics(professorId: string): Promise<ClassAnalyticsResponse> {
    const estudanteIds = await this.repo.getAlunosPorProfessor(professorId);
    if (!estudanteIds.length) {
      return {
        totalAlunosAtivos: 0,
        mediaProgresso: 0,
        alunosEmRisco: [],
        areaMaisFragil: null
      };
    }

    const riscoData = await this.repo.getAlunosRiscosData(estudanteIds);
    const areaMaisFragil = await this.repo.getAreaMaisFragil(estudanteIds);

    const totalXp = riscoData.reduce((acc, aluno) => acc + aluno.xpTotal, 0);
    const mediaProgresso = riscoData.length > 0 ? Math.round(totalXp / riscoData.length) : 0;

    return {
      totalAlunosAtivos: estudanteIds.length,
      mediaProgresso,
      alunosEmRisco: riscoData.sort((a, b) => {
        // Ordenar alto > medio > baixo
        const riskWeight = { alto: 3, medio: 2, baixo: 1 };
        return riskWeight[b.risco] - riskWeight[a.risco];
      }),
      areaMaisFragil
    };
  }
}
