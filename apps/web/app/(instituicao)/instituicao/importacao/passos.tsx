'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AcaoLinha,
  ArquivoRecebidoResponse,
  Importacao,
  MapeamentoColunas,
  PreviaResponse,
  TipoImportacao,
} from '@notaa/contracts';
import { Badge, Button, FileDrop, Label, OptionCard, Progress, Select, Skeleton, Stat, Table, cn } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';

const ACOES: Record<AcaoLinha, { rotulo: string; variante: 'success' | 'info' | 'neutral' | 'error' }> = {
  criar: { rotulo: 'Criar', variante: 'success' },
  atualizar: { rotulo: 'Atualizar', variante: 'info' },
  sem_alteracao: { rotulo: 'Sem alteração', variante: 'neutral' },
  recusar: { rotulo: 'Recusar', variante: 'error' },
};

// ─── Passo 1: tipo e arquivo ─────────────────────────────────────────────────

export function PassoArquivo({
  tipo,
  setTipo,
  arquivo,
  setArquivo,
  ocupado,
  onBaixarModelo,
  onEnviar,
}: {
  tipo: TipoImportacao;
  setTipo: (t: TipoImportacao) => void;
  arquivo: File | null;
  setArquivo: (f: File) => void;
  ocupado: boolean;
  onBaixarModelo: () => void;
  onEnviar: () => void;
}) {
  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="O que você vai importar" className="grid gap-3 sm:grid-cols-2">
        <OptionCard
          title="Alunos e responsáveis"
          description="Matrícula, nome, turma e até dois responsáveis por aluno"
          selected={tipo === 'alunos'}
          onClick={() => setTipo('alunos')}
        />
        <OptionCard
          title="Disciplinas"
          description="Nome, código e área do ENEM"
          selected={tipo === 'disciplinas'}
          onClick={() => setTipo('disciplinas')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 p-4">
        <p className="flex-1 text-sm text-text">
          Comece pelo modelo: ele já vem com as colunas certas e uma linha de exemplo.
        </p>
        <Button variant="secondary" size="sm" onClick={onBaixarModelo}>
          Baixar modelo (.csv)
        </Button>
      </div>

      <FileDrop
        id="arquivo-importacao"
        accept=".csv,.xlsx"
        rotulo="Planilha preenchida"
        descricao="CSV ou Excel (.xlsx), até 10 MB e 5.000 linhas. A primeira linha precisa ser o cabeçalho."
        arquivo={arquivo}
        disabled={ocupado}
        onArquivo={setArquivo}
      />

      <div className="flex justify-end">
        <Button onClick={onEnviar} disabled={!arquivo || ocupado}>
          {ocupado ? 'Enviando e conferindo…' : 'Enviar e continuar'}
        </Button>
      </div>
    </div>
  );
}

// ─── Passo 2: mapear colunas ─────────────────────────────────────────────────

export function PassoMapeamento({
  recebido,
  mapeamento,
  setMapeamento,
  ocupado,
  onVoltar,
  onContinuar,
}: {
  recebido: ArquivoRecebidoResponse;
  mapeamento: MapeamentoColunas;
  setMapeamento: (m: MapeamentoColunas) => void;
  ocupado: boolean;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const faltando = recebido.campos.filter((c) => c.obrigatorio && (mapeamento[c.campo] ?? null) === null);
  const usadas = Object.values(mapeamento).filter((v): v is number => v !== null);
  const repetidas = new Set(usadas.filter((v, i) => usadas.indexOf(v) !== i));

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">
        Recebemos {recebido.totalLinhas.toLocaleString('pt-BR')} linhas ({recebido.formato.toUpperCase()}). Diga em que
        coluna da sua planilha está cada informação. Já sugerimos pelo nome das colunas.
      </p>
      <Table caption="Correspondência entre campos e colunas da planilha" captionOculta>
        <thead>
          <tr>
            <th scope="col">Campo</th>
            <th scope="col">Coluna da planilha</th>
          </tr>
        </thead>
        <tbody>
          {recebido.campos.map((c) => {
            const valor = mapeamento[c.campo] ?? null;
            const erro =
              (c.obrigatorio && valor === null) || (valor !== null && repetidas.has(valor));
            const idDica = `dica-${c.campo}`;
            return (
              <tr key={c.campo}>
                <td className="w-1/2">
                  <Label htmlFor={`map-${c.campo}`} className="flex items-center gap-2">
                    {c.rotulo}
                    {c.obrigatorio ? <Badge variant="warning">Obrigatório</Badge> : null}
                  </Label>
                  {c.descricao ? (
                    <p id={idDica} className="mt-1 text-xs text-text-muted">
                      {c.descricao}
                    </p>
                  ) : null}
                </td>
                <td>
                  <Select
                    id={`map-${c.campo}`}
                    value={valor === null ? '' : String(valor)}
                    error={erro}
                    aria-describedby={c.descricao ? idDica : undefined}
                    onChange={(e) =>
                      setMapeamento({ ...mapeamento, [c.campo]: e.target.value === '' ? null : Number(e.target.value) })
                    }
                  >
                    <option value="">Não importar</option>
                    {recebido.cabecalhos.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Coluna ${i + 1} (sem nome)`}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {faltando.length || repetidas.size ? (
        <ul role="alert" className="space-y-1 text-sm text-error">
          {faltando.map((c) => (
            <li key={c.campo}>Escolha a coluna de “{c.rotulo}”.</li>
          ))}
          {repetidas.size ? <li>Há dois campos apontando para a mesma coluna.</li> : null}
        </ul>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onVoltar}>
          Trocar arquivo
        </Button>
        <Button onClick={onContinuar} disabled={ocupado || faltando.length > 0 || repetidas.size > 0}>
          {ocupado ? 'Salvando…' : 'Ver prévia'}
        </Button>
      </div>
    </div>
  );
}

// ─── Passo 3: prévia ─────────────────────────────────────────────────────────

const POR_PAGINA = 100;

export function PassoPrevia({
  importacaoId,
  tipo,
  ocupado,
  onVoltar,
  onConfirmar,
}: {
  importacaoId: string;
  tipo: TipoImportacao;
  ocupado: boolean;
  onVoltar: () => void;
  onConfirmar: () => void;
}) {
  const [filtro, setFiltro] = useState<AcaoLinha | null>(null);
  const [pagina, setPagina] = useState(1);
  const [previa, setPrevia] = useState<PreviaResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setPrevia(null);
    try {
      const q = new URLSearchParams({ pagina: String(pagina), porPagina: String(POR_PAGINA) });
      if (filtro) q.set('acao', filtro);
      setPrevia(await apiFetch<PreviaResponse>(`/importacoes/${importacaoId}/previa?${q}`));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível montar a prévia.');
    }
  }, [importacaoId, filtro, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
        <Button variant="secondary" onClick={onVoltar}>
          Voltar às colunas
        </Button>
      </div>
    );
  }

  const resumo = previa?.resumo;
  const mudancas = resumo ? resumo.criar + resumo.atualizar : 0;
  const paginas = previa ? Math.max(1, Math.ceil(previa.total / POR_PAGINA)) : 1;
  const rotuloChave = tipo === 'alunos' ? 'Matrícula' : 'Disciplina';

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filtrar linhas por resultado" className="grid gap-3 sm:grid-cols-4">
        {(Object.keys(ACOES) as AcaoLinha[]).map((acao) => (
          <button
            key={acao}
            type="button"
            aria-pressed={filtro === acao}
            onClick={() => {
              setFiltro(filtro === acao ? null : acao);
              setPagina(1);
            }}
            className={cn(
              'min-h-[44px] rounded-lg border p-3 text-left transition-colors duration-base',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
              filtro === acao ? 'border-brand-secondary bg-surface-2' : 'border-border bg-surface hover:bg-surface-2',
            )}
          >
            <span className="block text-2xl font-bold text-text">
              {resumo ? resumo[acao].toLocaleString('pt-BR') : '…'}
            </span>
            <span className="text-sm text-text-muted">{ACOES[acao].rotulo}</span>
          </button>
        ))}
      </div>

      {previa === null ? (
        <Skeleton className="h-64 w-full" />
      ) : previa.linhas.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma linha neste filtro.</p>
      ) : (
        <Table caption={filtro ? `Linhas: ${ACOES[filtro].rotulo}` : 'Todas as linhas da planilha'}>
          <thead>
            <tr>
              <th scope="col">Linha</th>
              <th scope="col">{rotuloChave}</th>
              <th scope="col">Nome</th>
              <th scope="col">Resultado</th>
              <th scope="col">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {previa.linhas.map((l) => (
              <tr key={l.linha}>
                <td className="tabular-nums">{l.linha}</td>
                <td className="font-mono text-xs">{l.chave ?? '—'}</td>
                <td>{l.nome ?? '—'}</td>
                <td>
                  <Badge variant={ACOES[l.acao].variante}>{ACOES[l.acao].rotulo}</Badge>
                </td>
                <td className={l.acao === 'recusar' ? 'text-error' : 'text-text-muted'}>
                  {l.motivos.length ? l.motivos.join(' ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {paginas > 1 ? (
        <nav aria-label="Páginas da prévia" className="flex items-center justify-center gap-3 text-sm">
          <Button variant="ghost" size="sm" onClick={() => setPagina(pagina - 1)} disabled={pagina === 1}>
            Anterior
          </Button>
          <span aria-live="polite">
            Página {pagina} de {paginas}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setPagina(pagina + 1)} disabled={pagina === paginas}>
            Próxima
          </Button>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button variant="secondary" onClick={onVoltar}>
          Voltar às colunas
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          {resumo ? (
            <p className="text-sm text-text-muted">
              {mudancas === 0
                ? 'Nada a gravar: a planilha não traz novidade.'
                : `${resumo.criar} a criar e ${resumo.atualizar} a atualizar. ${resumo.recusar} recusada(s) fica(m) de fora.`}
            </p>
          ) : null}
          <Button onClick={onConfirmar} disabled={ocupado || !resumo || mudancas === 0}>
            {ocupado ? 'Confirmando…' : 'Confirmar importação'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Passo 4: progresso e relatório ─────────────────────────────────────────

export function PassoResultado({ importacaoId, onNova }: { importacaoId: string; onNova: () => void }) {
  const [imp, setImp] = useState<Importacao | null>(null);

  useEffect(() => {
    let ativo = true;
    let espera: ReturnType<typeof setTimeout>;
    const consultar = async () => {
      try {
        const atual = await apiFetch<Importacao>(`/importacoes/${importacaoId}`);
        if (!ativo) return;
        setImp(atual);
        if (atual.status === 'pendente' || atual.status === 'processando') espera = setTimeout(consultar, 1500);
      } catch {
        if (ativo) espera = setTimeout(consultar, 3000);
      }
    };
    void consultar();
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [importacaoId]);

  if (!imp) return <Skeleton className="h-32 w-full" />;
  const emAndamento = imp.status === 'pendente' || imp.status === 'processando';
  const r = imp.relatorio;

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="space-y-3">
        {emAndamento ? (
          <>
            <p className="text-sm text-text">
              {imp.status === 'pendente' ? 'Na fila, aguardando o processamento…' : 'Gravando…'}
            </p>
            <Progress
              value={imp.linhasProcessadas}
              max={imp.totalLinhas ?? 1}
              label={`${imp.linhasProcessadas.toLocaleString('pt-BR')} de ${(imp.totalLinhas ?? 0).toLocaleString('pt-BR')} linhas`}
            />
          </>
        ) : imp.status === 'falhou' ? (
          <p role="alert" className="rounded-md border border-error p-3 text-sm text-error">
            A importação falhou: {imp.erro ?? 'erro desconhecido'}
          </p>
        ) : (
          <p className="text-sm font-semibold text-success">Importação concluída.</p>
        )}
      </div>

      {r ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Criados" value={r.criados.toLocaleString('pt-BR')} />
            <Stat label="Atualizados" value={r.atualizados.toLocaleString('pt-BR')} />
            <Stat label="Sem alteração" value={r.semAlteracao.toLocaleString('pt-BR')} />
            <Stat label="Recusados" value={r.recusados.toLocaleString('pt-BR')} />
          </div>
          {r.responsaveisVinculados > 0 ? (
            <p className="text-sm text-text-muted">
              {r.responsaveisVinculados.toLocaleString('pt-BR')} responsável(is) vinculado(s) a alunos.
            </p>
          ) : null}
          {r.recusas.length ? (
            <Table caption="Linhas recusadas, para corrigir e importar de novo">
              <thead>
                <tr>
                  <th scope="col">Linha</th>
                  <th scope="col">Chave</th>
                  <th scope="col">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {r.recusas.slice(0, 200).map((l) => (
                  <tr key={l.linha}>
                    <td className="tabular-nums">{l.linha}</td>
                    <td className="font-mono text-xs">{l.chave ?? '—'}</td>
                    <td className="text-error">{l.motivos.join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </>
      ) : null}

      {!emAndamento ? (
        <div className="flex justify-end">
          <Button onClick={onNova}>Nova importação</Button>
        </div>
      ) : null}
    </div>
  );
}
