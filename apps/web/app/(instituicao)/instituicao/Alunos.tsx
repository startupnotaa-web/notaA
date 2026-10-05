'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AlunoDaInstituicao, Turma } from '@notaa/contracts';
import { Badge, Card, CardHeader, Input, Label, Skeleton } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

const ROTULO_RISCO: Record<AlunoDaInstituicao['risco'], string> = {
  alto: 'Atenção',
  medio: 'Observar',
  baixo: 'Em dia',
};

function diasDesde(iso: string | null): string {
  if (!iso) return 'Nunca acessou';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return `${dias} dias`;
}

export function Alunos() {
  const [alunos, setAlunos] = useState<AlunoDaInstituicao[] | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const parametros = new URLSearchParams();
      if (turmaId) parametros.set('turmaId', turmaId);
      if (busca.trim()) parametros.set('busca', busca.trim());
      const sufixo = parametros.toString() ? `?${parametros}` : '';
      setAlunos(await apiFetch<AlunoDaInstituicao[]>(`/instituicao/alunos${sufixo}`));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os alunos.');
      setAlunos([]);
    }
  }, [turmaId, busca]);

  useEffect(() => {
    void apiFetch<Turma[]>('/turma')
      .then(setTurmas)
      .catch(() => setTurmas([]));
  }, []);

  useEffect(() => {
    // Busca refeita no servidor a cada mudança, com um atraso curto para não
    // disparar uma requisição por tecla digitada.
    const timer = setTimeout(() => void carregar(), 300);
    return () => clearTimeout(timer);
  }, [carregar]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1 space-y-1">
          <Label htmlFor="busca-aluno">Buscar por nome</Label>
          <Input
            id="busca-aluno"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Nome do aluno"
          />
        </div>
        <div className="min-w-[12rem] space-y-1">
          <Label htmlFor="filtro-turma">Turma</Label>
          <select
            id="filtro-turma"
            value={turmaId}
            onChange={(ev) => setTurmaId(ev.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus"
          >
            <option value="">Todas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}

      {alunos === null ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : alunos.length === 0 ? (
        <Card>
          <CardHeader>
            <p className="text-sm text-text-muted">
              Nenhum aluno aqui. Alunos aparecem depois de entrarem numa turma com o código de
              convite e terem a entrada aprovada.
            </p>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-3 py-2 font-semibold">Aluno</th>
                <th className="px-3 py-2 font-semibold">Turmas</th>
                <th className="px-3 py-2 font-semibold">Situação</th>
                <th className="px-3 py-2 font-semibold">Último acesso</th>
                <th className="px-3 py-2 font-semibold">Ofensiva</th>
                <th className="px-3 py-2 font-semibold">XP</th>
                <th className="px-3 py-2 font-semibold">Visível desde</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.estudanteId} className="border-b border-border/50">
                  <td className="px-3 py-2 font-semibold text-text">{a.nome ?? 'Sem nome'}</td>
                  <td className="px-3 py-2 text-text-muted">
                    {a.turmas.map((t) => t.nome).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={a.risco === 'baixo' ? 'neutral' : 'brand'}>
                      {ROTULO_RISCO[a.risco]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{diasDesde(a.ultimoAcessoEm)}</td>
                  <td className="px-3 py-2 text-text">{a.streak}</td>
                  <td className="px-3 py-2 text-text">{a.xpTotal.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2 text-text-muted">
                    {new Date(a.visivelDesde).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-muted">
        &quot;Visível desde&quot; é a data de aprovação do aluno na turma. Nada anterior a ela é
        exibido. A situação considera engajamento, não nota.
      </p>
    </div>
  );
}
