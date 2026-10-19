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
import { Button, Carregando, Chip, FileDrop, Notice, OptionCard, Progress, Select, SkeletonLinhas, SummaryStrip, Table, Tabs } from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';

const ACOES: Record<AcaoLinha, { rotulo: string; variante: 'success' | 'info' | 'neutral' | 'danger' }> = {
  criar: { rotulo: 'Criar', variante: 'success' },
  atualizar: { rotulo: 'Atualizar', variante: 'info' },
  sem_alteracao: { rotulo: 'Sem alteração', variante: 'neutral' },
  recusar: { rotulo: 'Recusar', variante: 'danger' },
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

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-sunken p-4">
        <p className="flex-1 text-sm text-ink">
          Comece pelo modelo: ele já vem com as colunas certas e uma linha de exemplo.
        </p>
        <Button variant="secondary" onClick={onBaixarModelo}>
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
      <p className="text-sm text-ink-muted">
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
                  <p className="flex items-center gap-2 font-bold">
                    {c.rotulo}
                    {c.obrigatorio ? <Chip tone="warning">Obrigatório</Chip> : null}
                  </p>
                  {c.descricao ? (
                    <p id={idDica} className="mt-1 text-caption text-ink-muted">
                      {c.descricao}
                    </p>
                  ) : null}
                </td>
                <td>
                  <Select
                    id={`map-${c.campo}`}
                    label="Coluna da planilha"
                    value={valor === null ? '' : String(valor)}
                    error={erro ? (valor === null ? 'Escolha a coluna deste campo.' : 'Esta coluna já está em outro campo.') : undefined}
                    aria-describedby={c.descricao ? idDica : undefined}
                    onChange={(e) =>
                      setMapeamento({ ...mapeamento, [c.campo]: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    options={[
                      { value: '', label: 'Não importar' },
                      ...recebido.cabecalhos.map((h, i) => ({ value: String(i), label: h || `Coluna ${i + 1} (sem nome)` })),
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {faltando.length || repetidas.size ? (
        <Notice tone="danger" title="Falta ajustar o mapeamento">
          <ul className="m-0 list-disc space-y-1 pl-5">
            {faltando.map((c) => (
              <li key={c.campo}>Escolha a coluna de “{c.rotulo}”.</li>
            ))}
            {repetidas.size ? <li>Há dois campos apontando para a mesma coluna.</li> : null}
          </ul>
        </Notice>
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
        <Notice tone="danger">{erro}</Notice>
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
      <Tabs
        label="Filtrar linhas por resultado"
        value={filtro ?? 'todas'}
        onChange={(id) => {
          setFiltro(id === 'todas' ? null : (id as AcaoLinha));
          setPagina(1);
        }}
        tabs={[
          {
            id: 'todas',
            label: 'Todas',
            count: resumo ? (Object.keys(ACOES) as AcaoLinha[]).reduce((soma, acao) => soma + resumo[acao], 0) : undefined,
          },
          ...(Object.keys(ACOES) as AcaoLinha[]).map((acao) => ({ id: acao, label: ACOES[acao].rotulo, count: resumo ? resumo[acao] : undefined })),
        ]}
      />

      {previa === null ? (
        <Carregando rotulo="Montando a prévia">
          <SkeletonLinhas linhas={6} />
        </Carregando>
      ) : previa.linhas.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma linha neste filtro.</p>
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
                <td className="font-mono text-caption">{l.chave ?? '—'}</td>
                <td>{l.nome ?? '—'}</td>
                <td>
                  <Chip tone={ACOES[l.acao].variante}>{ACOES[l.acao].rotulo}</Chip>
                </td>
                <td className={l.acao === 'recusar' ? 'text-danger' : 'text-ink-muted'}>
                  {l.motivos.length ? l.motivos.join(' ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {paginas > 1 ? (
        <nav aria-label="Páginas da prévia" className="flex items-center justify-center gap-3 text-sm">
          <Button variant="quiet" onClick={() => setPagina(pagina - 1)} disabled={pagina === 1}>
            Anterior
          </Button>
          <span aria-live="polite">
            Página {pagina} de {paginas}
          </span>
          <Button variant="quiet" onClick={() => setPagina(pagina + 1)} disabled={pagina === paginas}>
            Próxima
          </Button>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="secondary" onClick={onVoltar}>
          Voltar às colunas
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          {resumo ? (
            <p className="text-sm text-ink-muted">
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

  if (!imp) {
    return (
      <Carregando rotulo="Carregando o resultado">
        <SkeletonLinhas linhas={3} />
      </Carregando>
    );
  }
  const emAndamento = imp.status === 'pendente' || imp.status === 'processando';
  const r = imp.relatorio;

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="space-y-3">
        {emAndamento ? (
          <>
            <p className="text-sm text-ink">
              {imp.status === 'pendente' ? 'Na fila, aguardando o processamento…' : 'Gravando…'}
            </p>
            <Progress
              value={imp.linhasProcessadas}
              max={imp.totalLinhas ?? 1}
              label={`${imp.linhasProcessadas.toLocaleString('pt-BR')} de ${(imp.totalLinhas ?? 0).toLocaleString('pt-BR')} linhas`}
            />
          </>
        ) : imp.status === 'falhou' ? (
          <Notice tone="danger" title="A importação falhou">
            {imp.erro ?? 'Erro desconhecido.'}
          </Notice>
        ) : (
          <Notice tone="success">Importação concluída.</Notice>
        )}
      </div>

      {r ? (
        <>
          <SummaryStrip
            aria-label="Resumo da importação"
            items={[
              { id: 'criados', label: 'Criados', value: r.criados.toLocaleString('pt-BR') },
              { id: 'atualizados', label: 'Atualizados', value: r.atualizados.toLocaleString('pt-BR') },
              { id: 'sem', label: 'Sem alteração', value: r.semAlteracao.toLocaleString('pt-BR') },
              { id: 'recusados', label: 'Recusados', value: r.recusados.toLocaleString('pt-BR') },
            ]}
          />
          {r.responsaveisVinculados > 0 ? (
            <p className="text-sm text-ink-muted">
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
                    <td className="font-mono text-caption">{l.chave ?? '—'}</td>
                    <td className="text-danger">{l.motivos.join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </>
      ) : null}

      {!emAndamento ? (
        <div>
          <Button onClick={onNova}>Nova importação</Button>
        </div>
      ) : null}
    </div>
  );
}
