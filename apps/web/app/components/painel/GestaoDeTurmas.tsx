'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AnoLetivo,
  CodigoConvite,
  ProfessorDaInstituicao,
  ProfessorDaTurma,
  SolicitacaoPendente,
  Turma,
} from '@notaa/contracts';
import { Button, Card, CardHeader, Chip, Notice, Select, Skeleton, TextField } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../lib/api-client';

/**
 * Gestão de turmas de quem é DONO delas: criar, gerar código, aprovar entradas e
 * arquivar. Serve aos dois donos possíveis, porque as rotas de `/turma` são de
 * dono e não de instituição.
 *
 * A criação segue perfis.md: um único campo, o nome. O ano letivo é o atual, e a
 * turma já nasce com código de convite.
 *
 * `podeGerenciarProfessores` separa os dois casos. A instituição cria a turma e
 * só depois vincula professores, então até vincular o primeiro a turma não
 * aceita aluno. O professor independente já entra como professor da própria
 * turma na criação, e não administra quadro de professores — mostrar esse bloco
 * para ele exibiria controles que a API recusa.
 */
export function GestaoDeTurmas({
  podeGerenciarProfessores,
}: {
  podeGerenciarProfessores: boolean;
}) {
  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState('');
  const [criando, setCriando] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [listaTurmas, listaAnos] = await Promise.all([
        apiFetch<Turma[]>('/turma'),
        apiFetch<AnoLetivo[]>('/ano-letivo'),
      ]);
      setTurmas(listaTurmas);
      setAnos(listaAnos);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar as turmas.');
      setTurmas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // O ano "atual" é o mais recente não arquivado. Sem nenhum, a criação de turma
  // fica bloqueada e a tela diz o que fazer, em vez de falhar no envio.
  const anoAtual = anos.filter((a) => !a.arquivado).at(-1) ?? null;

  async function criarTurma(e: React.FormEvent) {
    e.preventDefault();
    if (!anoAtual) return;
    setErro(null);
    setCriando(true);
    try {
      await apiFetch<Turma>('/turma', {
        method: 'POST',
        body: JSON.stringify({ nome: nomeNovo.trim(), anoLetivoId: anoAtual.id }),
      });
      setNomeNovo('');
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar a turma.');
    } finally {
      setCriando(false);
    }
  }

  async function acao(fn: () => Promise<unknown>, mensagemPadrao: string) {
    setErro(null);
    try {
      await fn();
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : mensagemPadrao);
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <form onSubmit={criarTurma} className="space-y-3">
            <TextField
              label="Criar turma"
              id="nome-turma"
              value={nomeNovo}
              onChange={(ev) => setNomeNovo(ev.target.value)}
              placeholder="Ex.: 3º ano B"
              required
              disabled={!anoAtual}
              hint={
                anoAtual
                  ? `Será criada no ano letivo ${anoAtual.rotulo}, já com código de convite.`
                  : 'Crie um ano letivo na aba Ano letivo antes de criar turmas.'
              }
            />
            <Button type="submit" disabled={criando || !anoAtual || nomeNovo.trim().length < 2}>
              {criando ? 'Criando…' : 'Criar turma'}
            </Button>
          </form>
        </CardHeader>
      </Card>

      {erro && (
        <Notice tone="danger">{erro}</Notice>
      )}

      {turmas === null ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : turmas.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma turma ainda.</p>
      ) : (
        <ul className="space-y-3">
          {turmas.map((t) => (
            <li key={t.id}>
              <CartaoTurma
                turma={t}
                podeGerenciarProfessores={podeGerenciarProfessores}
                expandida={aberta === t.id}
                onAlternar={() => setAberta(aberta === t.id ? null : t.id)}
                onRegenerarCodigo={() =>
                  acao(
                    () => apiFetch<CodigoConvite>(`/turma/${t.id}/codigo`, { method: 'POST' }),
                    'Não foi possível gerar um código novo.',
                  )
                }
                onArquivar={() =>
                  acao(
                    () =>
                      apiFetch<Turma>(`/turma/${t.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ arquivada: !t.arquivada }),
                      }),
                    'Não foi possível alterar a turma.',
                  )
                }
                onDecidir={() => carregar()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoTurma({
  turma,
  podeGerenciarProfessores,
  expandida,
  onAlternar,
  onRegenerarCodigo,
  onArquivar,
  onDecidir,
}: {
  turma: Turma;
  podeGerenciarProfessores: boolean;
  expandida: boolean;
  onAlternar: () => void;
  onRegenerarCodigo: () => Promise<void>;
  onArquivar: () => Promise<void>;
  onDecidir: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-ink">{turma.nome}</p>
              <Chip tone="neutral">{turma.anoLetivo.rotulo}</Chip>
              {turma.arquivada && <Chip tone="neutral">Arquivada</Chip>}
              {podeGerenciarProfessores && !turma.aceitaAluno && !turma.arquivada && (
                <Chip tone="neutral">Sem professor</Chip>
              )}
            </div>
            <p className="text-sm text-ink-muted">
              {turma.quantidadeDeAlunos} aluno(s) · {turma.quantidadeDeProfessores} professor(es)
              {turma.solicitacoesPendentes > 0 && ` · ${turma.solicitacoesPendentes} pendente(s)`}
            </p>
            {podeGerenciarProfessores && !turma.aceitaAluno && !turma.arquivada && (
              <p className="text-[12.5px] leading-[18px] text-ink-muted">
                Vincule um professor para a turma aceitar alunos.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onAlternar}>
              {expandida ? 'Fechar' : 'Gerenciar'}
            </Button>
          </div>
        </div>

        {expandida && (
          <div className="mt-4 space-y-5 border-t border-line pt-4">
            <div className="space-y-2">
              <p className="text-[12.5px] font-bold text-ink-muted">
                Código de convite
              </p>
              {turma.codigoConvite ? (
                <p className="font-mono font-display text-2xl font-semibold leading-8 text-ink">
                  {turma.codigoConvite}
                </p>
              ) : (
                <p className="text-sm text-ink-muted">Sem código ativo.</p>
              )}
              <p className="text-[12.5px] leading-[18px] text-ink-muted">
                Gerar um código novo invalida o anterior. Quem já está na turma não é afetado.
              </p>
              <Button variant="secondary" onClick={() => void onRegenerarCodigo()}>
                Gerar código novo
              </Button>
            </div>

            {podeGerenciarProfessores && (
              <ProfessoresDaTurma turmaId={turma.id} onMudou={onDecidir} />
            )}

            <Solicitacoes turmaId={turma.id} onDecidir={onDecidir} />

            <div className="space-y-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={() => void onArquivar()}>
                {turma.arquivada ? 'Reativar turma' : 'Arquivar turma'}
              </Button>
              <p className="text-[12.5px] leading-[18px] text-ink-muted">
                Turma arquivada fica somente leitura e não aceita novos alunos.
              </p>
            </div>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

/** Fila de aprovação. Aprovar e recusar aceitam seleção múltipla (perfis.md). */
function Solicitacoes({ turmaId, onDecidir }: { turmaId: string; onDecidir: () => Promise<void> }) {
  const [pendentes, setPendentes] = useState<SolicitacaoPendente[] | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const lista = await apiFetch<SolicitacaoPendente[]>(`/turma/${turmaId}/solicitacoes`);
      setPendentes(lista);
      setSelecionados(lista.map((s) => s.estudanteId));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar as solicitações.');
      setPendentes([]);
    }
  }, [turmaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function decidir(decisao: 'aprovar' | 'recusar') {
    if (selecionados.length === 0) return;
    setErro(null);
    setEnviando(true);
    try {
      await apiFetch(`/turma/${turmaId}/solicitacoes/${decisao}`, {
        method: 'POST',
        body: JSON.stringify({ estudanteIds: selecionados }),
      });
      await carregar();
      await onDecidir();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível concluir.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <p className="text-[12.5px] font-bold text-ink-muted">
        Entradas pendentes
      </p>

      {pendentes === null ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : pendentes.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma solicitação aguardando.</p>
      ) : (
        <>
          <ul className="space-y-1">
            {pendentes.map((s) => (
              <li key={s.estudanteId}>
                <label className="flex min-h-[44px] items-center gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary"
                    checked={selecionados.includes(s.estudanteId)}
                    onChange={(ev) =>
                      setSelecionados((atual) =>
                        ev.target.checked
                          ? [...atual, s.estudanteId]
                          : atual.filter((id) => id !== s.estudanteId),
                      )
                    }
                  />
                  <span>{s.nome ?? 'Sem nome'}</span>
                  <span className="text-[12.5px] leading-[18px] text-ink-muted">
                    {new Date(s.solicitadoEm).toLocaleDateString('pt-BR')}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-[12.5px] leading-[18px] text-ink-muted">
            A partir da aprovação, a instituição passa a ver o rendimento do aluno. Nada anterior a
            ela fica visível.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
             
              onClick={() => void decidir('aprovar')}
              disabled={enviando || selecionados.length === 0}
            >
              Aprovar {selecionados.length > 0 && `(${selecionados.length})`}
            </Button>
            <Button
              variant="secondary"
             
              onClick={() => void decidir('recusar')}
              disabled={enviando || selecionados.length === 0}
            >
              Recusar
            </Button>
          </div>
        </>
      )}

      {erro && (
        <Notice tone="danger">{erro}</Notice>
      )}
    </div>
  );
}

/**
 * Professores de uma turma. É aqui que a turma passa a aceitar aluno: sem
 * nenhum professor vinculado, o código de convite não funciona.
 *
 * Só professores DA instituição aparecem na lista de opções — o servidor recusa
 * qualquer outro, e oferecer só o que é aceitável evita um erro previsível.
 */
function ProfessoresDaTurma({
  turmaId,
  onMudou,
}: {
  turmaId: string;
  onMudou: () => Promise<void>;
}) {
  const [daTurma, setDaTurma] = useState<ProfessorDaTurma[] | null>(null);
  const [daInstituicao, setDaInstituicao] = useState<ProfessorDaInstituicao[]>([]);
  const [escolhido, setEscolhido] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [vinculados, quadro] = await Promise.all([
        apiFetch<ProfessorDaTurma[]>(`/turma/${turmaId}/professores`),
        apiFetch<ProfessorDaInstituicao[]>('/instituicao/professores'),
      ]);
      setDaTurma(vinculados);
      setDaInstituicao(quadro);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os professores.');
      setDaTurma([]);
    }
  }, [turmaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const disponiveis = daInstituicao.filter(
    (p) => !(daTurma ?? []).some((v) => v.professorId === p.professorId),
  );

  async function mutar(fn: () => Promise<unknown>, mensagemPadrao: string) {
    setErro(null);
    setEnviando(true);
    try {
      await fn();
      await carregar();
      await onMudou();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : mensagemPadrao);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <p className="text-[12.5px] font-bold text-ink-muted">Professores</p>

      {daTurma === null ? (
        <Skeleton className="h-12 w-full rounded-lg" />
      ) : daTurma.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhum professor vinculado. Enquanto isso, a turma não aceita alunos.
        </p>
      ) : (
        <ul className="space-y-1">
          {daTurma.map((p) => (
            <li key={p.professorId} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink">{p.nome ?? p.email}</span>
              <Button
                variant="quiet"
               
                disabled={enviando}
                onClick={() =>
                  void mutar(
                    () =>
                      apiFetch(`/turma/${turmaId}/professores/${p.professorId}`, {
                        method: 'DELETE',
                      }),
                    'Não foi possível desvincular.',
                  )
                }
              >
                Desvincular
              </Button>
            </li>
          ))}
        </ul>
      )}

      {disponiveis.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Vincular professor"
            id={`add-prof-${turmaId}`}
            className="min-w-[14rem] flex-1"
            value={escolhido}
            onChange={(ev) => setEscolhido(ev.target.value)}
            options={[
              { value: '', label: 'Selecione…' },
              ...disponiveis.map((p) => ({ value: p.professorId, label: p.nome ?? p.email })),
            ]}
          />
          <Button
           
            disabled={enviando || !escolhido}
            onClick={() =>
              void mutar(async () => {
                await apiFetch(`/turma/${turmaId}/professores`, {
                  method: 'POST',
                  body: JSON.stringify({ professorId: escolhido }),
                });
                setEscolhido('');
              }, 'Não foi possível vincular.')
            }
          >
            Vincular
          </Button>
        </div>
      )}

      {daInstituicao.length === 0 && (
        <p className="text-[12.5px] leading-[18px] text-ink-muted">
          Nenhum professor no quadro ainda. Convide professores na aba Professores.
        </p>
      )}

      {erro && (
        <Notice tone="danger">{erro}</Notice>
      )}
    </div>
  );
}
