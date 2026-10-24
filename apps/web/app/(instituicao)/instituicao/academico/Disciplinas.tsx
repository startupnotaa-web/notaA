'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AreaEnem,
  Disciplina,
  ProfessorDaTurma,
  Turma,
  TurmaDisciplina,
} from '@notaa/contracts';
import {
  Button,
  Carregando,
  Chip,
  EmptyState,
  Notice,
  Panel,
  Section,
  Select,
  SkeletonLinhas,
  Table,
  TextField,
} from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { toast } from '../../../components/toast';

const AREAS: { valor: AreaEnem; rotulo: string }[] = [
  { valor: 'linguagens', rotulo: 'Linguagens' },
  { valor: 'humanas', rotulo: 'Ciências Humanas' },
  { valor: 'natureza', rotulo: 'Ciências da Natureza' },
  { valor: 'matematica', rotulo: 'Matemática' },
  { valor: 'redacao', rotulo: 'Redação' },
];
const rotuloArea = (a: AreaEnem | null) =>
  AREAS.find((x) => x.valor === a)?.rotulo ?? 'Sem área do ENEM';

function mensagem(e: unknown, padrao: string): string {
  return e instanceof ApiError ? e.message : padrao;
}

/**
 * Disciplinas da instituição e quem leciona cada uma em cada turma. A área do
 * ENEM liga a disciplina ao desempenho do aluno na plataforma.
 */
export function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[] | null>(null);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [area, setArea] = useState<AreaEnem | ''>('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDisciplinas(await apiFetch<Disciplina[]>('/academico/disciplinas'));
    } catch (e) {
      setErro(mensagem(e, 'Não foi possível carregar as disciplinas.'));
      setDisciplinas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function criar() {
    setErro(null);
    setEnviando(true);
    try {
      await apiFetch<Disciplina>('/academico/disciplinas', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          codigo: codigo.trim() || null,
          areaEnem: area || null,
        }),
      });
      setNome('');
      setCodigo('');
      setArea('');
      toast('Disciplina criada.', { variant: 'success' });
      await carregar();
    } catch (e) {
      setErro(mensagem(e, 'Não foi possível criar a disciplina.'));
    } finally {
      setEnviando(false);
    }
  }

  async function alternarArquivo(d: Disciplina) {
    try {
      await apiFetch<Disciplina>(`/academico/disciplinas/${d.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ arquivada: !d.arquivada }),
      });
      await carregar();
    } catch (e) {
      toast(mensagem(e, 'Não foi possível atualizar a disciplina.'), { variant: 'error' });
    }
  }

  return (
    <div className="flex flex-col gap-space-7">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-space-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-space-7">
        <Section title="Disciplinas" className="min-w-0">
          {disciplinas === null ? (
            <Carregando rotulo="Carregando as disciplinas">
              <SkeletonLinhas linhas={4} />
            </Carregando>
          ) : disciplinas.length === 0 ? (
            <EmptyState title="Nenhuma disciplina ainda">
              Crie ao lado ou importe a planilha que a instituição já usa, em “Importação e
              exportação”.
            </EmptyState>
          ) : (
            <Table caption="Disciplinas da instituição" captionOculta>
              <thead>
                <tr>
                  <th scope="col">Disciplina</th>
                  <th scope="col">Código</th>
                  <th scope="col">Área do ENEM</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {disciplinas.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium text-ink">{d.nome}</td>
                    <td>{d.codigo ?? '—'}</td>
                    <td>{rotuloArea(d.areaEnem)}</td>
                    <td>
                      {d.arquivada ? (
                        <Chip tone="neutral">Arquivada</Chip>
                      ) : (
                        <Chip tone="success">Ativa</Chip>
                      )}
                    </td>
                    <td className="text-right">
                      <Button variant="quiet" onClick={() => void alternarArquivo(d)}>
                        {d.arquivada ? 'Desarquivar' : 'Arquivar'}
                        <span className="sr-only"> {d.nome}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Section>

        <Panel
          title="Nova disciplina"
          description="Disciplina não é apagada: arquive quando sair da grade."
          className="self-start"
        >
          <form
            className="flex flex-col gap-space-5"
            onSubmit={(e) => {
              e.preventDefault();
              void criar();
            }}
          >
            <fieldset
              disabled={enviando}
              className="m-0 flex min-w-0 flex-col gap-space-5 border-0 p-0"
            >
              <TextField
                label="Nome"
                id="disciplina-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
              <TextField
                label="Código (opcional)"
                id="disciplina-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                maxLength={20}
              />
              <Select
                label="Área do ENEM"
                value={area}
                onChange={(e) => setArea(e.target.value as AreaEnem | '')}
                options={[
                  { value: '', label: 'Sem área do ENEM' },
                  ...AREAS.map((a) => ({ value: a.valor, label: a.rotulo })),
                ]}
              />
              {erro ? <Notice tone="danger">{erro}</Notice> : null}
              <Button type="submit" className="w-full" loading={enviando}>
                {enviando ? 'Salvando' : 'Criar disciplina'}
              </Button>
            </fieldset>
          </form>
        </Panel>
      </div>

      <AtribuicaoPorTurma disciplinas={(disciplinas ?? []).filter((d) => !d.arquivada)} />
    </div>
  );
}

/** Quais disciplinas cada turma tem e qual professor leciona cada uma. */
function AtribuicaoPorTurma({ disciplinas }: { disciplinas: Disciplina[] }) {
  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [turmaId, setTurmaId] = useState('');
  const [atribuicoes, setAtribuicoes] = useState<TurmaDisciplina[] | null>(null);
  const [professores, setProfessores] = useState<ProfessorDaTurma[]>([]);
  const [novaDisciplina, setNovaDisciplina] = useState('');

  useEffect(() => {
    apiFetch<Turma[]>('/turma')
      .then((lista) => {
        const ativas = lista.filter((t) => !t.arquivada);
        setTurmas(ativas);
        setTurmaId((atual) => atual || ativas[0]?.id || '');
      })
      .catch(() => setTurmas([]));
  }, []);

  const carregarTurma = useCallback(async (id: string) => {
    if (!id) return;
    setAtribuicoes(null);
    try {
      const [a, p] = await Promise.all([
        apiFetch<TurmaDisciplina[]>(`/academico/turmas/${id}/disciplinas`),
        apiFetch<ProfessorDaTurma[]>(`/turma/${id}/professores`),
      ]);
      setAtribuicoes(a);
      setProfessores(p);
    } catch (e) {
      toast(mensagem(e, 'Não foi possível carregar a turma.'), { variant: 'error' });
      setAtribuicoes([]);
    }
  }, []);

  useEffect(() => {
    void carregarTurma(turmaId);
  }, [turmaId, carregarTurma]);

  async function atribuir(disciplinaId: string, professorId: string | null) {
    try {
      setAtribuicoes(
        await apiFetch<TurmaDisciplina[]>(
          `/academico/turmas/${turmaId}/disciplinas/${disciplinaId}`,
          {
            method: 'PUT',
            body: JSON.stringify({ professorId }),
          },
        ),
      );
    } catch (e) {
      toast(mensagem(e, 'Não foi possível salvar a atribuição.'), { variant: 'error' });
    }
  }

  async function retirar(disciplinaId: string) {
    try {
      await apiFetch<void>(`/academico/turmas/${turmaId}/disciplinas/${disciplinaId}`, {
        method: 'DELETE',
      });
      await carregarTurma(turmaId);
    } catch (e) {
      toast(mensagem(e, 'Não foi possível retirar a disciplina.'), { variant: 'error' });
    }
  }

  const disponiveis = disciplinas.filter(
    (d) => !atribuicoes?.some((a) => a.disciplina.id === d.id),
  );

  return (
    <Section
      title="Disciplinas por turma"
      description="Só aparecem professores já vinculados à turma. Vincule na aba Turmas do painel."
      divided
      action={
        turmas && turmas.length > 0 ? (
          <Select
            label="Turma"
            className="w-64"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            options={turmas.map((t) => ({
              value: t.id,
              label: `${t.nome} (${t.anoLetivo.rotulo})`,
            }))}
          />
        ) : null
      }
    >
      {turmas === null ? (
        <Carregando rotulo="Carregando as turmas">
          <SkeletonLinhas linhas={3} />
        </Carregando>
      ) : turmas.length === 0 ? (
        <EmptyState title="Nenhuma turma ativa">Crie turmas na aba Turmas do painel.</EmptyState>
      ) : atribuicoes === null ? (
        <Carregando rotulo="Carregando as disciplinas da turma">
          <SkeletonLinhas linhas={3} />
        </Carregando>
      ) : (
        <>
          {atribuicoes.length > 0 ? (
            <Table caption="Disciplinas e professores da turma selecionada" captionOculta>
              <thead>
                <tr>
                  <th scope="col">Disciplina</th>
                  <th scope="col">Professor</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {atribuicoes.map((a) => (
                  <tr key={a.disciplina.id}>
                    <td className="font-medium text-ink">{a.disciplina.nome}</td>
                    <td>
                      <Select
                        label={`Professor de ${a.disciplina.nome}`}
                        labelOculto
                        value={a.professor?.id ?? ''}
                        onChange={(e) => void atribuir(a.disciplina.id, e.target.value || null)}
                        className="max-w-xs"
                        options={[
                          { value: '', label: 'Sem professor' },
                          ...professores.map((p) => ({
                            value: p.professorId,
                            label: p.nome ?? p.email,
                          })),
                        ]}
                      />
                    </td>
                    <td className="text-right">
                      <Button variant="quiet" onClick={() => void retirar(a.disciplina.id)}>
                        Retirar<span className="sr-only"> {a.disciplina.nome} da turma</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="m-0 text-body-sm text-ink-muted">Esta turma ainda não tem disciplinas.</p>
          )}
          <form
            className="flex flex-wrap items-end gap-space-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (novaDisciplina)
                void atribuir(novaDisciplina, null).then(() => setNovaDisciplina(''));
            }}
          >
            <Select
              label="Adicionar disciplina à turma"
              className="w-72"
              value={novaDisciplina}
              onChange={(e) => setNovaDisciplina(e.target.value)}
              disabled={disponiveis.length === 0}
              options={[
                {
                  value: '',
                  label: disponiveis.length ? 'Escolha a disciplina' : 'Todas já estão na turma',
                },
                ...disponiveis.map((d) => ({ value: d.id, label: d.nome })),
              ]}
            />
            <Button type="submit" variant="secondary" disabled={!novaDisciplina}>
              Adicionar
            </Button>
          </form>
        </>
      )}
    </Section>
  );
}
