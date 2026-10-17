'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AlunoDaInstituicao, Turma } from '@notaa/contracts';
import { Chip, EmptyState, Notice, Select, Skeleton, Table, TextField } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

const ROTULO_RISCO: Record<AlunoDaInstituicao['risco'], string> = {
  alto: 'Atenção',
  medio: 'Observar',
  baixo: 'Em dia',
};

const TOM_RISCO = { alto: 'danger', medio: 'warning', baixo: 'success' } as const;

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
        <TextField
          label="Buscar por nome"
          id="busca-aluno"
          className="min-w-[14rem] flex-1"
          value={busca}
          onChange={(ev) => setBusca(ev.target.value)}
          placeholder="Nome do aluno"
        />
        <Select
          label="Turma"
          id="filtro-turma"
          className="min-w-[12rem]"
          value={turmaId}
          onChange={(ev) => setTurmaId(ev.target.value)}
          options={[{ value: '', label: 'Todas' }, ...turmas.map((t) => ({ value: t.id, label: t.nome }))]}
        />
      </div>

      {erro && <Notice tone="danger">{erro}</Notice>}

      {alunos === null ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : alunos.length === 0 ? (
        <EmptyState title="Nenhum aluno aqui">
          Alunos aparecem depois de entrarem numa turma com o código de convite e terem a entrada aprovada.
        </EmptyState>
      ) : (
        <Table caption="Alunos da instituição" captionOculta className="min-w-[44rem]">
          <thead>
            <tr>
              <th scope="col">Aluno</th>
              <th scope="col">Turmas</th>
              <th scope="col">Situação</th>
              <th scope="col">Último acesso</th>
              <th scope="col" className="text-right">Ofensiva</th>
              <th scope="col" className="text-right">XP</th>
              <th scope="col">Visível desde</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((a) => (
              <tr key={a.estudanteId}>
                <th scope="row" className="text-left font-bold text-ink">
                  {a.nome ?? 'Sem nome'}
                </th>
                <td className="text-ink-muted">{a.turmas.map((t) => t.nome).join(', ') || '—'}</td>
                <td>
                  <Chip tone={TOM_RISCO[a.risco]}>{ROTULO_RISCO[a.risco]}</Chip>
                </td>
                <td className="text-ink-muted">{diasDesde(a.ultimoAcessoEm)}</td>
                <td className="tabular text-right">{a.streak}</td>
                <td className="tabular text-right">{a.xpTotal.toLocaleString('pt-BR')}</td>
                <td className="text-ink-muted">{new Date(a.visivelDesde).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <p className="text-[12.5px] leading-[18px] text-ink-muted">
        &quot;Visível desde&quot; é a data de aprovação do aluno na turma. Nada anterior a ela é
        exibido. A situação considera engajamento, não nota.
      </p>
    </div>
  );
}
