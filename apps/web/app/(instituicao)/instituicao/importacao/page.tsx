'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LIMITE_IMPORTACAO_BYTES,
  type ArquivoRecebidoResponse,
  type CriarImportacaoResponse,
  type Importacao,
  type MapeamentoColunas,
  type TipoImportacao,
} from '@notaa/contracts';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, SectionHeader, Stepper } from '@notaa/ui';
import { ApiError, apiDownload, apiFetch, enviarPlanilha } from '../../../../lib/api-client';
import { toast } from '../../../components/toast';
import { PassoArquivo, PassoMapeamento, PassoPrevia, PassoResultado } from './passos';

const PASSOS = ['Tipo e arquivo', 'Colunas', 'Prévia', 'Resultado'] as const;

function mensagem(e: unknown, padrao: string): string {
  return e instanceof ApiError ? e.message : padrao;
}

/**
 * Importação de planilha em quatro passos. Nada é gravado até a confirmação no
 * passo 3; a gravação roda no worker e esta tela acompanha o progresso.
 */
export default function ImportacaoPage() {
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<TipoImportacao>('alunos');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const [recebido, setRecebido] = useState<ArquivoRecebidoResponse | null>(null);
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>({});
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primeiraRenderizacao = useRef(true);

  // Ao trocar de passo, o foco vai ao título dele (quem usa leitor de tela
  // ouve onde está). No carregamento da página, não: o foco fica onde o
  // navegador põe.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    titulo.current?.focus();
  }, [passo]);

  function recomecar() {
    setPasso(0);
    setArquivo(null);
    setImportacaoId(null);
    setRecebido(null);
    setMapeamento({});
    setErro(null);
  }

  async function executar(fn: () => Promise<void>, padrao: string) {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setErro(mensagem(e, padrao));
    } finally {
      setOcupado(false);
    }
  }

  const enviar = () =>
    executar(async () => {
      if (!arquivo) return;
      if (!/\.(csv|xlsx)$/i.test(arquivo.name)) throw new ApiError(0, 'EXTENSAO', 'Envie um arquivo .csv ou .xlsx.');
      if (arquivo.size > LIMITE_IMPORTACAO_BYTES) throw new ApiError(0, 'TAMANHO', 'O arquivo passa de 10 MB.');
      const criada = await apiFetch<CriarImportacaoResponse>('/importacoes', {
        method: 'POST',
        body: JSON.stringify({ tipo, nomeArquivo: arquivo.name, tamanhoBytes: arquivo.size }),
      });
      await enviarPlanilha(criada.upload, arquivo);
      const r = await apiFetch<ArquivoRecebidoResponse>(`/importacoes/${criada.id}/arquivo-enviado`, { method: 'POST' });
      setImportacaoId(criada.id);
      setRecebido(r);
      setMapeamento(r.mapeamentoSugerido);
      setPasso(1);
    }, 'Não foi possível enviar o arquivo.');

  const salvarMapeamento = () =>
    executar(async () => {
      await apiFetch<Importacao>(`/importacoes/${importacaoId}/mapeamento`, {
        method: 'PUT',
        body: JSON.stringify({ mapeamento }),
      });
      setPasso(2);
    }, 'Não foi possível salvar o mapeamento.');

  const confirmar = () =>
    executar(async () => {
      await apiFetch<Importacao>(`/importacoes/${importacaoId}/confirmar`, { method: 'POST' });
      setPasso(3);
    }, 'Não foi possível confirmar a importação.');

  async function exportar(qual: TipoImportacao) {
    try {
      await apiDownload(`/importacoes/exportar/${qual}`, `${qual}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      toast(mensagem(e, 'Não foi possível exportar.'), { variant: 'error' });
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 lg:px-8">
      <SectionHeader
        as="h1"
        title="Importação e exportação"
        description="Traga o cadastro de alunos, responsáveis e disciplinas de uma planilha. Reimportar a mesma planilha não duplica ninguém."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <Stepper passos={PASSOS} atual={passo} aria-label="Etapas da importação" />
          <Card>
            <CardContent className="space-y-6 pt-6">
              <h2 ref={titulo} tabIndex={-1} className="text-xl font-bold text-text focus:outline-none">
                {passo + 1}. {PASSOS[passo]}
              </h2>
              {erro ? (
                <p role="alert" className="rounded-md border border-error p-3 text-sm text-error">
                  {erro}
                </p>
              ) : null}
              {passo === 0 ? (
                <PassoArquivo
                  tipo={tipo}
                  setTipo={setTipo}
                  arquivo={arquivo}
                  setArquivo={setArquivo}
                  ocupado={ocupado}
                  onBaixarModelo={() =>
                    void apiDownload(`/importacoes/modelos/${tipo}`, `modelo-${tipo}.csv`).catch((e) =>
                      toast(mensagem(e, 'Não foi possível baixar o modelo.'), { variant: 'error' }),
                    )
                  }
                  onEnviar={() => void enviar()}
                />
              ) : null}
              {passo === 1 && recebido ? (
                <PassoMapeamento
                  recebido={recebido}
                  mapeamento={mapeamento}
                  setMapeamento={setMapeamento}
                  ocupado={ocupado}
                  onVoltar={recomecar}
                  onContinuar={() => void salvarMapeamento()}
                />
              ) : null}
              {passo === 2 && importacaoId ? (
                <PassoPrevia
                  importacaoId={importacaoId}
                  tipo={tipo}
                  ocupado={ocupado}
                  onVoltar={() => setPasso(1)}
                  onConfirmar={() => void confirmar()}
                />
              ) : null}
              {passo === 3 && importacaoId ? <PassoResultado importacaoId={importacaoId} onNova={recomecar} /> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Exportar</CardTitle>
            <CardDescription>
              CSV no mesmo formato do modelo, pronto para editar e importar de volta. Só a gestão exporta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="secondary" fullWidth onClick={() => void exportar('alunos')}>
              Alunos e responsáveis
            </Button>
            <Button variant="secondary" fullWidth onClick={() => void exportar('disciplinas')}>
              Disciplinas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
