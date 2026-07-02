'use client';

import { useEffect, useState } from 'react';
import type { ClassAnalyticsResponse } from '@notaa/contracts';
import { Card, CardHeader, CardContent, CardTitle, Badge, Button, cn } from '@notaa/ui';
import { apiFetch } from '../../../lib/api-client';
import { RiskBadge } from './components/RiskBadge';

export default function ProfessorDashboard() {
  const [data, setData] = useState<ClassAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'turma' | 'areas' | 'aluno'>('turma');
  const [filterRisco, setFilterRisco] = useState<'todos' | 'alto' | 'medio' | 'baixo'>('todos');

  useEffect(() => {
    async function loadData() {
      try {
        const response = await apiFetch<ClassAnalyticsResponse>('/class/analytics');
        setData(response);
      } catch (err) {
        console.error('Erro ao carregar analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-text-muted">
        Carregando dados da turma...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center text-error">
        Erro ao carregar dados.
      </div>
    );
  }

  const alunosFiltrados = data.alunosEmRisco.filter(
    (aluno) => filterRisco === 'todos' || aluno.risco === filterRisco
  );

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6 bg-bg text-text min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard Analítico</h1>
          <p className="text-text-muted">Acompanhe o desempenho da sua turma em tempo real.</p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-muted">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalAlunosAtivos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-muted">Progresso Médio (XP)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.mediaProgresso}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-text-muted">Área Mais Frágil</CardTitle>
          </CardHeader>
          <CardContent>
            {data.areaMaisFragil ? (
              <div>
                <div className="text-xl font-bold capitalize">{data.areaMaisFragil.area}</div>
                <div className="text-sm text-error">
                  Apenas {(data.areaMaisFragil.mediaAcertos * 100).toFixed(0)}% de acerto
                </div>
              </div>
            ) : (
              <div className="text-lg text-text-muted">Nenhum dado</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-4">
        <button
          className={cn("py-2 px-1 border-b-2 transition-colors font-medium text-sm", activeTab === 'turma' ? "border-brand-primary text-brand-primary" : "border-transparent text-text-muted hover:text-text")}
          onClick={() => setActiveTab('turma')}
        >
          Visão da Turma
        </button>
        <button
          className={cn("py-2 px-1 border-b-2 transition-colors font-medium text-sm", activeTab === 'areas' ? "border-brand-primary text-brand-primary" : "border-transparent text-text-muted hover:text-text")}
          onClick={() => setActiveTab('areas')}
        >
          Visão por Áreas
        </button>
      </div>

      {/* Tab Content: Visão da Turma */}
      {activeTab === 'turma' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={filterRisco === 'todos' ? 'cta' : 'secondary'} size="sm" onClick={() => setFilterRisco('todos')}>Todos</Button>
            <Button variant={filterRisco === 'alto' ? 'cta' : 'secondary'} size="sm" onClick={() => setFilterRisco('alto')}>Alto Risco</Button>
            <Button variant={filterRisco === 'medio' ? 'cta' : 'secondary'} size="sm" onClick={() => setFilterRisco('medio')}>Médio Risco</Button>
            <Button variant={filterRisco === 'baixo' ? 'cta' : 'secondary'} size="sm" onClick={() => setFilterRisco('baixo')}>Bom</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alunosFiltrados.length === 0 ? (
              <p className="text-text-muted">Nenhum aluno encontrado neste filtro.</p>
            ) : (
              alunosFiltrados.map((aluno) => (
                <Card key={aluno.id} className="hover:border-brand-primary/50 transition-colors">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-text truncate pr-2">{aluno.nome}</span>
                      <RiskBadge risco={aluno.risco} />
                    </div>
                    <div className="text-sm text-text-muted line-clamp-2">
                      {aluno.motivo}
                    </div>
                    <div className="flex gap-4 mt-auto pt-2 border-t border-border/50 text-xs text-text-muted">
                      <span>🔥 {aluno.streak} dias</span>
                      <span>⭐ {aluno.xpTotal} XP</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Visão por Áreas */}
      {activeTab === 'areas' && (
        <Card>
          <CardContent className="p-8 text-center text-text-muted">
            Gráficos e análises detalhadas por matéria chegarão em breve nesta aba!
          </CardContent>
        </Card>
      )}
    </main>
  );
}
