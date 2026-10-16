'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AreaEnem, Disciplina, ProfessorDaTurma, Turma, TurmaDisciplina } from '@notaa/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
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
const rotuloArea = (a: AreaEnem | null) => AREAS.find((x) => x.valor === a)?.rotulo ?? 'Sem área do ENEM';

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
        body: JSON.stringify({ nome: nome.trim(), codigo: codigo.trim() || null, areaEnem: area || null }),
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
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-text">Disciplinas</h2>
          {disciplinas === null ? (
            <Skeleton className="h-40 w-full" />
          ) : disciplinas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">
              Nenhuma disciplina ainda. Crie ao lado ou importe uma planilha em “Importação e exportação”.
            </p>
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
                    <td className="font-medium text-text">{d.nome}</td>
                    <td>{d.codigo ?? '—'}</td>
                    <td>{rotuloArea(d.areaEnem)}</td>
                    <td>{d.arquivada ? <Badge variant="neutral">Arquivada</Badge> : <Badge variant="success">Ativa</Badge>}</td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => void alternarArquivo(d)}>
                        {d.arquivada ? 'Desarquivar' : 'Arquivar'}
                        <span className="sr-only"> {d.nome}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova disciplina</CardTitle>
            <CardDescription>Disciplina não é apagada: arquive quando sair da grade.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void criar();
              }}
            >
              <fieldset disabled={enviando} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="disciplina-nome">Nome</Label>
                  <Input id="disciplina-nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={80} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="disciplina-codigo">Código (opcional)</Label>
                  <Input id="disciplina-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={20} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="disciplina-area">Área do ENEM</Label>
                  <Select id="disciplina-area" value={area} onChange={(e) => setArea(e.target.value as AreaEnem | '')}>
                    <option value="">Sem área do ENEM</option>
                    {AREAS.map((a) => (
                      <option key={a.valor} value={a.valor}>
                        {a.rotulo}
                      </option>
                    ))}
                  </Select>
                </div>
                {erro ? (
                  <p role="alert" className="text-sm text-error">
                    {erro}
                  </p>
                ) : null}
                <Button type="submit" fullWidth>
                  {enviando ? 'Salvando…' : 'Criar disciplina'}
                </Button>
              </fieldset>
            </form>
          </CardContent>
        </Card>
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
        await apiFetch<TurmaDisciplina[]>(`/academico/turmas/${turmaId}/disciplinas/${disciplinaId}`, {
          method: 'PUT',
          body: JSON.stringify({ professorId }),
        }),
      );
    } catch (e) {
      toast(mensagem(e, 'Não foi possível salvar a atribuição.'), { variant: 'error' });
    }
  }

  async function retirar(disciplinaId: string) {
    try {
      await apiFetch<void>(`/academico/turmas/${turmaId}/disciplinas/${disciplinaId}`, { method: 'DELETE' });
      await carregarTurma(turmaId);
    } catch (e) {
      toast(mensagem(e, 'Não foi possível retirar a disciplina.'), { variant: 'error' });
    }
  }

  const disponiveis = disciplinas.filter((d) => !atribuicoes?.some((a) => a.disciplina.id === d.id));

  return (
    <section aria-labelledby="titulo-atribuicao" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="titulo-atribuicao" className="text-lg font-bold text-text">
            Disciplinas por turma
          </h2>
          <p className="text-sm text-text-muted">
            Só aparecem professores já vinculados à turma. Vincule na aba Turmas do painel.
          </p>
        </div>
        {turmas && turmas.length > 0 ? (
          <div className="w-64 space-y-1">
            <Label htmlFor="atribuicao-turma">Turma</Label>
            <Select id="atribuicao-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.anoLetivo.rotulo})
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {turmas === null ? (
        <Skeleton className="h-32 w-full" />
      ) : turmas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">
          Nenhuma turma ativa. Crie turmas na aba Turmas do painel.
        </p>
      ) : atribuicoes === null ? (
        <Skeleton className="h-32 w-full" />
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
                    <td className="font-medium text-text">{a.disciplina.nome}</td>
                    <td>
                      <Label htmlFor={`prof-${a.disciplina.id}`} className="sr-only">
                        Professor de {a.disciplina.nome}
                      </Label>
                      <Select
                        id={`prof-${a.disciplina.id}`}
                        value={a.professor?.id ?? ''}
                        onChange={(e) => void atribuir(a.disciplina.id, e.target.value || null)}
                        className="max-w-xs"
                      >
                        <option value="">Sem professor</option>
                        {professores.map((p) => (
                          <option key={p.professorId} value={p.professorId}>
                            {p.nome ?? p.email}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => void retirar(a.disciplina.id)}>
                        Retirar<span className="sr-only"> {a.disciplina.nome} da turma</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-sm text-text-muted">Esta turma ainda não tem disciplinas.</p>
          )}
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (novaDisciplina) void atribuir(novaDisciplina, null).then(() => setNovaDisciplina(''));
            }}
          >
            <div className="w-72 space-y-1">
              <Label htmlFor="atribuicao-disciplina">Adicionar disciplina à turma</Label>
              <Select
                id="atribuicao-disciplina"
                value={novaDisciplina}
                onChange={(e) => setNovaDisciplina(e.target.value)}
                disabled={disponiveis.length === 0}
              >
                <option value="">{disponiveis.length ? 'Escolha a disciplina' : 'Todas já estão na turma'}</option>
                {disponiveis.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary" disabled={!novaDisciplina}>
              Adicionar
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
