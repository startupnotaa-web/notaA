import { Injectable } from '@nestjs/common';
import { DesempenhoRepository } from '../desempenho/desempenho.repository';
import { IndicadoresService } from '../desempenho/indicadores.service';
import { EscopoService } from '../escopo/escopo.service';
import type { ClassAnalyticsResponse, IndicadorDeTurma } from '@notaa/contracts';

@Injectable()
export class ClassService {
  constructor(
    private readonly desempenho: DesempenhoRepository,
    private readonly escopo: EscopoService,
    private readonly indicadores: IndicadoresService,
  ) {}

  /**
   * Nível 1 do painel do professor: uma linha por turma em que ele leciona.
   *
   * Existe separado de `/turma` porque aquela rota é de DONO (quem cria e
   * administra), e professor institucional não é dono de nada — ele precisa ver
   * as turmas que leciona sem poder criar ou renomear.
   */
  async turmasDoProfessor(professorId: string): Promise<IndicadorDeTurma[]> {
    const turmaIds = await this.escopo.turmasDoProfessor(professorId);
    return this.indicadores.deTurmas(turmaIds);
  }

  /**
   * Painel do professor. O escopo vem do EscopoService: as turmas em que ele
   * leciona, os alunos com matrícula aprovada nelas, e a janela de dados de cada
   * um. As agregações recebem essa lista e nunca consultam aluno fora dela.
   */
  async getAnalytics(professorId: string): Promise<ClassAnalyticsResponse> {
    const turmaIds = await this.escopo.turmasDoProfessor(professorId);
    const alunos = await this.escopo.alunosVisiveis(turmaIds);

    if (!alunos.length) {
      return {
        totalAlunosAtivos: 0,
        mediaProgresso: 0,
        alunosEmRisco: [],
        areaMaisFragil: null
      };
    }

    const [riscoData, areaMaisFragil] = await Promise.all([
      this.desempenho.metricasPorAluno(alunos),
      this.desempenho.areaMaisFragil(alunos),
    ]);

    const totalXp = riscoData.reduce((acc, aluno) => acc + aluno.xpTotal, 0);
    const mediaProgresso = riscoData.length > 0 ? Math.round(totalXp / riscoData.length) : 0;

    return {
      totalAlunosAtivos: alunos.length,
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
