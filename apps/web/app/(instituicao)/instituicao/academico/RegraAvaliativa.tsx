'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  JustificativaSchema,
  quantidadeDePeriodos,
  RegraAvaliativaSchema,
  TAMANHO_MINIMO_JUSTIFICATIVA,
  type AnoLetivo,
  type ModoRecuperacao,
  type RegraAvaliativa as Regra,
  type RegraAvaliativaVersao,
} from '@notaa/contracts';
import {
  Button,
  Carregando,
  Chip,
  Dialog,
  Input,
  Notice,
  OptionCard,
  Panel,
  SkeletonLinhas,
  Stepper,
  Switch,
  Table,
  TextField,
} from '@notaa/ui';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { toast } from '../../../components/toast';
import { comRegime, ETAPA_DO_CAMPO, ETAPAS, FAIXAS_PADRAO, REGRA_PADRAO } from './regra';
import { SimuladorRegra } from './SimuladorRegra';

/**
 * Regra avaliativa em formulário guiado, com o simulador ao lado. Salvar grava
 * uma VERSÃO NOVA (a anterior não muda); a versão só vale depois de ativada.
 */
export function RegraAvaliativa({ anoLetivo }: { anoLetivo: AnoLetivo }) {
  const [versoes, setVersoes] = useState<RegraAvaliativaVersao[] | null>(null);
  const [regra, setRegra] = useState<Regra>(REGRA_PADRAO);
  const [etapa, setEtapa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  // Motivo de salvar uma versão (vai para a auditoria) e o da ativação, no diálogo.
  const [motivoSalvar, setMotivoSalvar] = useState('');
  const [erroMotivoSalvar, setErroMotivoSalvar] = useState<string | null>(null);
  const [ativando, setAtivando] = useState<RegraAvaliativaVersao | null>(null);
  const [motivoAtivar, setMotivoAtivar] = useState('');
  const [erroMotivoAtivar, setErroMotivoAtivar] = useState<string | null>(null);
  const [ativandoAgora, setAtivandoAgora] = useState(false);
  const tituloEtapa = useRef<HTMLHeadingElement>(null);
  const somenteLeitura = anoLetivo.arquivado;

  const carregar = useCallback(
    async (preencher: boolean) => {
      try {
        const lista = await apiFetch<RegraAvaliativaVersao[]>(
          `/academico/regras?anoLetivoId=${anoLetivo.id}`,
        );
        setVersoes(lista);
        if (preencher) setRegra((lista.find((v) => v.ativa) ?? lista[0])?.regra ?? REGRA_PADRAO);
      } catch (e) {
        toast(e instanceof ApiError ? e.message : 'Não foi possível carregar as regras.', {
          variant: 'error',
        });
        setVersoes([]);
      }
    },
    [anoLetivo.id],
  );

  useEffect(() => {
    setVersoes(null);
    void carregar(true);
  }, [carregar]);

  const validacao = useMemo(() => RegraAvaliativaSchema.safeParse(regra), [regra]);
  const errosPorEtapa = useMemo(() => {
    const mapa = new Map<number, string[]>();
    if (!validacao.success) {
      for (const issue of validacao.error.issues) {
        const e = ETAPA_DO_CAMPO[issue.path[0] as keyof Regra] ?? 0;
        mapa.set(e, [...(mapa.get(e) ?? []), issue.message]);
      }
    }
    return mapa;
  }, [validacao]);

  function irPara(i: number) {
    setEtapa(i);
    // Leva o foco ao título da etapa: quem usa leitor de tela ouve onde está.
    requestAnimationFrame(() => tituloEtapa.current?.focus());
  }

  async function salvar() {
    if (!validacao.success) {
      const primeira = Math.min(...errosPorEtapa.keys());
      irPara(primeira);
      toast('Há campos a corrigir antes de salvar.', { variant: 'error' });
      return;
    }
    const motivo = JustificativaSchema.safeParse(motivoSalvar);
    if (!motivo.success) {
      setErroMotivoSalvar(motivo.error.issues[0]!.message);
      return;
    }
    setErroMotivoSalvar(null);
    setSalvando(true);
    try {
      const criada = await apiFetch<RegraAvaliativaVersao>('/academico/regras', {
        method: 'POST',
        body: JSON.stringify({
          anoLetivoId: anoLetivo.id,
          regra: validacao.data,
          justificativa: motivo.data,
        }),
      });
      toast(`Versão ${criada.versao} salva. Ative-a para que passe a valer.`, {
        variant: 'success',
      });
      setMotivoSalvar('');
      await carregar(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Não foi possível salvar a regra.', {
        variant: 'error',
      });
    } finally {
      setSalvando(false);
    }
  }

  function pedirAtivacao(v: RegraAvaliativaVersao) {
    setMotivoAtivar('');
    setErroMotivoAtivar(null);
    setAtivando(v);
  }

  async function ativar(v: RegraAvaliativaVersao) {
    const motivo = JustificativaSchema.safeParse(motivoAtivar);
    if (!motivo.success) {
      setErroMotivoAtivar(motivo.error.issues[0]!.message);
      return;
    }
    setAtivandoAgora(true);
    try {
      await apiFetch<RegraAvaliativaVersao>(`/academico/regras/${v.id}/ativar`, {
        method: 'POST',
        body: JSON.stringify({ justificativa: motivo.data }),
      });
      toast(`Versão ${v.versao} ativada.`, { variant: 'success' });
      setAtivando(null);
      await carregar(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Não foi possível ativar a versão.', {
        variant: 'error',
      });
    } finally {
      setAtivandoAgora(false);
    }
  }

  const erros = errosPorEtapa.get(etapa) ?? [];
  const periodos = quantidadeDePeriodos(regra.regime);

  return (
    <div className="flex flex-col gap-space-7">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-space-7 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-space-6">
          <Stepper
            passos={ETAPAS}
            atual={etapa}
            onIrPara={irPara}
            aria-label="Etapas da regra avaliativa"
          />

          <Panel>
            <div className="flex flex-col gap-space-6">
              <h2
                ref={tituloEtapa}
                tabIndex={-1}
                className="font-display text-heading-3 text-ink focus:outline-none"
              >
                {etapa + 1}. {ETAPAS[etapa]}
              </h2>
              <fieldset
                disabled={somenteLeitura}
                className="m-0 flex min-w-0 flex-col gap-space-6 border-0 p-0"
              >
                <legend className="sr-only">{ETAPAS[etapa]}</legend>
                {etapa === 0 ? <EtapaRegime regra={regra} setRegra={setRegra} /> : null}
                {etapa === 1 ? <EtapaEscala regra={regra} setRegra={setRegra} /> : null}
                {etapa === 2 ? <EtapaNotaPeriodo regra={regra} setRegra={setRegra} /> : null}
                {etapa === 3 ? (
                  <EtapaMediaFinal regra={regra} setRegra={setRegra} periodos={periodos} />
                ) : null}
                {etapa === 4 ? <EtapaArredondamento regra={regra} setRegra={setRegra} /> : null}
                {etapa === 5 ? <EtapaRecuperacao regra={regra} setRegra={setRegra} /> : null}
                {etapa === 6 ? <EtapaAprovacao regra={regra} setRegra={setRegra} /> : null}
                {etapa === 7 ? <EtapaConselho regra={regra} setRegra={setRegra} /> : null}
              </fieldset>

              {erros.length ? (
                <Notice tone="danger" title="Confira a regra">
                  <ul className="m-0 flex list-disc flex-col gap-space-1 pl-5">
                    {erros.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Notice>
              ) : null}

              {etapa === ETAPAS.length - 1 && !somenteLeitura ? (
                <TextField
                  label="Motivo da mudança"
                  hint={`Fica registrado na auditoria, com o seu nome. Não cite nomes de pessoas. Mínimo de ${TAMANHO_MINIMO_JUSTIFICATIVA} caracteres.`}
                  value={motivoSalvar}
                  maxLength={500}
                  error={erroMotivoSalvar}
                  onChange={(e) => {
                    setMotivoSalvar(e.target.value);
                    setErroMotivoSalvar(null);
                  }}
                />
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-space-3 border-t border-line pt-space-4">
                <Button
                  variant="secondary"
                  onClick={() => irPara(etapa - 1)}
                  disabled={etapa === 0}
                >
                  Voltar
                </Button>
                {etapa < ETAPAS.length - 1 ? (
                  <Button onClick={() => irPara(etapa + 1)}>Próxima: {ETAPAS[etapa + 1]}</Button>
                ) : (
                  <Button
                    onClick={() => void salvar()}
                    disabled={somenteLeitura}
                    loading={salvando}
                  >
                    {salvando ? 'Salvando' : 'Salvar como nova versão'}
                  </Button>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <aside aria-label="Simulador" className="lg:sticky lg:top-20 lg:self-start">
          <SimuladorRegra regra={regra} valida={validacao.success} />
        </aside>
      </div>

      <section aria-labelledby="titulo-versoes" className="space-y-3">
        <h2 id="titulo-versoes" className="font-display text-heading-3 text-ink">
          Versões da regra em {anoLetivo.rotulo}
        </h2>
        {versoes === null ? (
          <Carregando rotulo="Carregando as versões da regra">
            <SkeletonLinhas linhas={2} />
          </Carregando>
        ) : versoes.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma versão salva ainda.</p>
        ) : (
          <Table caption="Versões da regra avaliativa" captionOculta>
            <thead>
              <tr>
                <th scope="col">Versão</th>
                <th scope="col">Criada em</th>
                <th scope="col">Por</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {versoes.map((v) => (
                <tr key={v.id}>
                  <td className="font-semibold text-ink">v{v.versao}</td>
                  <td>{new Date(v.criadoEm).toLocaleString('pt-BR')}</td>
                  <td>{v.criadoPor.nome ?? '—'}</td>
                  <td>
                    {v.ativa ? (
                      <Chip tone="success">Vigente</Chip>
                    ) : (
                      <Chip tone="neutral">Inativa</Chip>
                    )}
                  </td>
                  <td className="space-x-2 whitespace-nowrap text-right">
                    <Button variant="quiet" onClick={() => setRegra(v.regra)}>
                      Abrir no formulário<span className="sr-only"> (versão {v.versao})</span>
                    </Button>
                    {!v.ativa && !somenteLeitura ? (
                      <Button variant="secondary" onClick={() => pedirAtivacao(v)}>
                        Ativar<span className="sr-only"> versão {v.versao}</span>
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <Dialog
        open={ativando !== null}
        onClose={() => (ativandoAgora ? undefined : setAtivando(null))}
        title={`Ativar a versão ${ativando?.versao ?? ''}`}
        description="A versão passa a valer para as notas deste ano letivo. Fica registrado na auditoria quem ativou e por quê."
        closeOnScrim={!ativandoAgora}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAtivando(null)} disabled={ativandoAgora}>
              Cancelar
            </Button>
            <Button loading={ativandoAgora} onClick={() => ativando && void ativar(ativando)}>
              Ativar versão
            </Button>
          </>
        }
      >
        <TextField
          label="Motivo da ativação"
          hint={`Fica registrado na auditoria. Não cite nomes de pessoas. Mínimo de ${TAMANHO_MINIMO_JUSTIFICATIVA} caracteres.`}
          value={motivoAtivar}
          maxLength={500}
          error={erroMotivoAtivar}
          onChange={(e) => {
            setMotivoAtivar(e.target.value);
            setErroMotivoAtivar(null);
          }}
        />
      </Dialog>
    </div>
  );
}

// ─── Peças do formulário ─────────────────────────────────────────────────────

type PropsEtapa = { regra: Regra; setRegra: (r: Regra) => void };

function Opcoes({ legenda, children }: { legenda: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={legenda} className="grid gap-3 sm:grid-cols-2">
      {children}
    </div>
  );
}

function CampoNumero({
  rotulo,
  valor,
  onChange,
  min,
  max,
  step = 0.1,
  dica,
}: {
  rotulo: string;
  valor: number | null;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  dica?: string;
}) {
  return (
    <TextField
      label={rotulo}
      type="number"
      inputMode="decimal"
      value={valor ?? ''}
      min={min}
      max={max}
      step={step}
      hint={dica}
      onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
    />
  );
}

function EtapaRegime({ regra, setRegra }: PropsEtapa) {
  const opcoes = [
    { tipo: 'bimestral', titulo: 'Bimestral', desc: '4 períodos' },
    { tipo: 'trimestral', titulo: 'Trimestral', desc: '3 períodos' },
    { tipo: 'semestral', titulo: 'Semestral', desc: '2 períodos' },
    { tipo: 'personalizado', titulo: 'Personalizado', desc: 'Você define quantos' },
  ] as const;
  return (
    <>
      <Opcoes legenda="Regime de períodos">
        {opcoes.map((o) => (
          <OptionCard
            key={o.tipo}
            title={o.titulo}
            description={o.desc}
            selected={regra.regime.tipo === o.tipo}
            onClick={() =>
              setRegra(
                comRegime(
                  regra,
                  o.tipo === 'personalizado' ? { tipo: o.tipo, quantidade: 5 } : { tipo: o.tipo },
                ),
              )
            }
          />
        ))}
      </Opcoes>
      {regra.regime.tipo === 'personalizado' ? (
        <div className="max-w-xs">
          <CampoNumero
            rotulo="Quantidade de períodos"
            valor={regra.regime.quantidade}
            min={1}
            max={12}
            step={1}
            onChange={(n) => setRegra(comRegime(regra, { tipo: 'personalizado', quantidade: n }))}
          />
        </div>
      ) : null}
    </>
  );
}

function EtapaEscala({ regra, setRegra }: PropsEtapa) {
  const e = regra.escala;
  return (
    <>
      <Opcoes legenda="Escala de notas">
        <OptionCard
          title="De 0 a 10"
          selected={e.tipo === 'numerica' && e.maximo === 10}
          onClick={() => setRegra({ ...regra, escala: { tipo: 'numerica', maximo: 10 } })}
        />
        <OptionCard
          title="De 0 a 100"
          selected={e.tipo === 'numerica' && e.maximo === 100}
          onClick={() => setRegra({ ...regra, escala: { tipo: 'numerica', maximo: 100 } })}
        />
        <OptionCard
          title="Conceitos"
          description="A, B, C, D… com faixas de nota"
          selected={e.tipo === 'conceitos'}
          onClick={() =>
            setRegra({ ...regra, escala: { tipo: 'conceitos', maximo: 10, faixas: FAIXAS_PADRAO } })
          }
        />
      </Opcoes>
      {e.tipo === 'conceitos' ? (
        <Table caption="Faixas de cada conceito. A faixa inclui o início e vai até antes do fim; a última inclui a nota máxima.">
          <thead>
            <tr>
              <th scope="col">Conceito</th>
              <th scope="col">De</th>
              <th scope="col">Até</th>
              <th scope="col">Vale no cálculo</th>
            </tr>
          </thead>
          <tbody>
            {e.faixas.map((f, i) => {
              const mudar = (campo: 'conceito' | 'min' | 'max' | 'valor', v: string) => {
                const faixas = e.faixas.map((x, j) =>
                  j === i ? { ...x, [campo]: campo === 'conceito' ? v : Number(v) } : x,
                );
                setRegra({ ...regra, escala: { ...e, faixas } });
              };
              return (
                <tr key={i}>
                  {(['conceito', 'min', 'max', 'valor'] as const).map((campo) => (
                    <td key={campo}>
                      <Input
                        aria-label={`${campo === 'conceito' ? 'Conceito' : campo === 'min' ? 'Início' : campo === 'max' ? 'Fim' : 'Valor'} da faixa ${i + 1}`}
                        type={campo === 'conceito' ? 'text' : 'number'}
                        step={0.1}
                        value={f[campo]}
                        onChange={(ev) => mudar(campo, ev.target.value)}
                        className="min-w-[5rem]"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : null}
    </>
  );
}

function EtapaNotaPeriodo({ regra, setRegra }: PropsEtapa) {
  const n = regra.notaPeriodo;
  const pesos = n.tipo === 'media_ponderada' ? n.pesos : [];
  return (
    <>
      <Opcoes legenda="Como se calcula a nota do período">
        <OptionCard
          title="Média aritmética"
          description="Todas as avaliações valem igual"
          selected={n.tipo === 'media_aritmetica'}
          onClick={() => setRegra({ ...regra, notaPeriodo: { tipo: 'media_aritmetica' } })}
        />
        <OptionCard
          title="Média ponderada"
          description="Cada avaliação tem um peso"
          selected={n.tipo === 'media_ponderada'}
          onClick={() =>
            setRegra({ ...regra, notaPeriodo: { tipo: 'media_ponderada', pesos: [1, 2] } })
          }
        />
        <OptionCard
          title="Soma de pontos"
          description={`As avaliações somam até ${regra.escala.maximo}`}
          selected={n.tipo === 'soma'}
          onClick={() => setRegra({ ...regra, notaPeriodo: { tipo: 'soma' } })}
        />
      </Opcoes>
      {n.tipo === 'media_ponderada' ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Um peso por avaliação, na ordem em que são lançadas.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            {pesos.map((p, i) => (
              <div key={i} className="w-28">
                <CampoNumero
                  rotulo={`Avaliação ${i + 1}`}
                  valor={p}
                  min={0.1}
                  onChange={(v) =>
                    setRegra({
                      ...regra,
                      notaPeriodo: {
                        tipo: 'media_ponderada',
                        pesos: pesos.map((x, j) => (j === i ? v : x)),
                      },
                    })
                  }
                />
              </div>
            ))}
            <Button
              variant="secondary"

              disabled={pesos.length >= 20}
              onClick={() =>
                setRegra({
                  ...regra,
                  notaPeriodo: { tipo: 'media_ponderada', pesos: [...pesos, 1] },
                })
              }
            >
              Adicionar avaliação
            </Button>
            <Button
              variant="quiet"

              disabled={pesos.length <= 1}
              onClick={() =>
                setRegra({
                  ...regra,
                  notaPeriodo: { tipo: 'media_ponderada', pesos: pesos.slice(0, -1) },
                })
              }
            >
              Remover a última
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function EtapaMediaFinal({ regra, setRegra, periodos }: PropsEtapa & { periodos: number }) {
  const pesos = regra.mediaFinal.pesosPorPeriodo;
  return (
    <>
      <p className="text-sm text-ink-muted">
        Peso de cada período na média final. Pesos iguais dão a média aritmética. Exemplo comum: 2,
        2, 3 e 3.
      </p>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: periodos }, (_, i) => (
          <div key={i} className="w-28">
            <CampoNumero
              rotulo={`${i + 1}º período`}
              valor={pesos[i] ?? null}
              min={0.1}
              onChange={(v) =>
                setRegra({
                  ...regra,
                  mediaFinal: { pesosPorPeriodo: pesos.map((x, j) => (j === i ? v : x)) },
                })
              }
            />
          </div>
        ))}
      </div>
    </>
  );
}

function EtapaArredondamento({ regra, setRegra }: PropsEtapa) {
  const a = regra.arredondamento;
  const casas = a.tipo === 'meio_ponto' ? 1 : a.casas;
  return (
    <>
      <Opcoes legenda="Regra de arredondamento">
        <OptionCard
          title="Normal"
          description="Meio para cima: 6,25 vira 6,3"
          selected={a.tipo === 'normal'}
          onClick={() => setRegra({ ...regra, arredondamento: { tipo: 'normal', casas } })}
        />
        <OptionCard
          title="Sempre para cima"
          description="6,21 vira 6,3"
          selected={a.tipo === 'para_cima'}
          onClick={() => setRegra({ ...regra, arredondamento: { tipo: 'para_cima', casas } })}
        />
        <OptionCard
          title="Meio ponto, o mais próximo"
          description="6,2 vira 6,0; 6,3 vira 6,5"
          selected={a.tipo === 'meio_ponto' && a.modo === 'proximo'}
          onClick={() =>
            setRegra({ ...regra, arredondamento: { tipo: 'meio_ponto', modo: 'proximo' } })
          }
        />
        <OptionCard
          title="Meio ponto, sempre acima"
          description="6,1 vira 6,5; 6,6 vira 7,0"
          selected={a.tipo === 'meio_ponto' && a.modo === 'acima'}
          onClick={() =>
            setRegra({ ...regra, arredondamento: { tipo: 'meio_ponto', modo: 'acima' } })
          }
        />
      </Opcoes>
      {a.tipo !== 'meio_ponto' ? (
        <Opcoes legenda="Casas decimais">
          {([0, 1, 2] as const).map((c) => (
            <OptionCard
              key={c}
              title={
                c === 0
                  ? 'Sem casas decimais'
                  : `${c} casa${c > 1 ? 's' : ''} decimal${c > 1 ? 'is' : ''}`
              }
              selected={a.casas === c}
              onClick={() => setRegra({ ...regra, arredondamento: { tipo: a.tipo, casas: c } })}
            />
          ))}
        </Opcoes>
      ) : null}
      <p className="text-sm text-ink-muted">
        Vale para a nota de cada período, a média final e as recuperações.
      </p>
    </>
  );
}

const MODOS: { modo: ModoRecuperacao; titulo: string; desc: string }[] = [
  { modo: 'maior', titulo: 'Fica a maior nota', desc: 'Recuperação só ajuda' },
  { modo: 'substitui', titulo: 'Substitui', desc: 'Vale a nota da recuperação, mesmo menor' },
  { modo: 'media', titulo: 'Faz média', desc: 'Média entre a nota e a recuperação' },
];

function EtapaRecuperacao({ regra, setRegra }: PropsEtapa) {
  const { paralela, final } = regra.recuperacao;
  const set = (r: Regra['recuperacao']) => setRegra({ ...regra, recuperacao: r });
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-ink">Recuperação paralela (por período)</h3>
          <Switch
            checked={paralela !== null}
            aria-label="Recuperação paralela"
            onCheckedChange={(ligada) =>
              set({ final, paralela: ligada ? { modo: 'maior' } : null })
            }
          />
        </div>
        {paralela ? (
          <Opcoes legenda="Como a recuperação paralela entra na nota">
            {MODOS.map((m) => (
              <OptionCard
                key={m.modo}
                title={m.titulo}
                description={m.desc}
                selected={paralela.modo === m.modo}
                onClick={() => set({ final, paralela: { modo: m.modo } })}
              />
            ))}
          </Opcoes>
        ) : null}
      </div>
      <div className="space-y-3 border-t border-line pt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-ink">Recuperação final (depois da média)</h3>
          <Switch
            checked={final !== null}
            aria-label="Recuperação final"
            onCheckedChange={(ligada) =>
              set({
                paralela,
                final: ligada
                  ? {
                      modo: 'media',
                      mediaMinimaParaAcesso: null,
                      mediaMinimaAposRecuperacao: regra.aprovacao.mediaMinima - 1,
                    }
                  : null,
              })
            }
          />
        </div>
        {final ? (
          <>
            <Opcoes legenda="Como a recuperação final entra na média">
              {MODOS.map((m) => (
                <OptionCard
                  key={m.modo}
                  title={m.titulo}
                  description={m.desc}
                  selected={final.modo === m.modo}
                  onClick={() => set({ paralela, final: { ...final, modo: m.modo } })}
                />
              ))}
            </Opcoes>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoNumero
                rotulo="Média mínima para ir à final"
                valor={final.mediaMinimaParaAcesso}
                min={0}
                dica="Deixe em branco para todos abaixo da média terem direito."
                onChange={(n) =>
                  set({
                    paralela,
                    final: { ...final, mediaMinimaParaAcesso: Number.isNaN(n) ? null : n },
                  })
                }
              />
              <CampoNumero
                rotulo="Média para aprovar depois da final"
                valor={final.mediaMinimaAposRecuperacao}
                min={0}
                onChange={(n) =>
                  set({ paralela, final: { ...final, mediaMinimaAposRecuperacao: n } })
                }
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function EtapaAprovacao({ regra, setRegra }: PropsEtapa) {
  const a = regra.aprovacao;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoNumero
        rotulo="Média mínima para aprovar"
        valor={a.mediaMinima}
        min={0}
        max={regra.escala.maximo}
        onChange={(n) => setRegra({ ...regra, aprovacao: { ...a, mediaMinima: n } })}
      />
      <CampoNumero
        rotulo="Frequência mínima (%)"
        valor={Math.round(a.frequenciaMinima * 1000) / 10}
        min={75}
        max={100}
        step={1}
        dica="A lei exige pelo menos 75%. Reprovação por falta não é revertida por recuperação nem conselho."
        onChange={(n) => setRegra({ ...regra, aprovacao: { ...a, frequenciaMinima: n / 100 } })}
      />
      <div className="flex items-center justify-between gap-4 sm:col-span-2">
        <div>
          <h3 className="font-semibold text-ink">Falta justificada conta como presença</h3>
          <p className="text-sm text-ink-muted">
            Desligado, a falta justificada continua contando como falta no percentual.
          </p>
        </div>
        <Switch
          checked={a.abonaFaltaJustificada}
          aria-label="Falta justificada conta como presença"
          onCheckedChange={(abonaFaltaJustificada) =>
            setRegra({ ...regra, aprovacao: { ...a, abonaFaltaJustificada } })
          }
        />
      </div>
    </div>
  );
}

function EtapaConselho({ regra, setRegra }: PropsEtapa) {
  const c = regra.conselhoDeClasse;
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-ink">Conselho de classe pode aprovar</h3>
          <p className="text-sm text-ink-muted">
            Decide sobre quem ficou abaixo da média. Nunca sobre falta.
          </p>
        </div>
        <Switch
          checked={c.habilitado}
          aria-label="Conselho de classe pode aprovar"
          onCheckedChange={(habilitado) =>
            setRegra({ ...regra, conselhoDeClasse: { ...c, habilitado } })
          }
        />
      </div>
      {c.habilitado ? (
        <div className="max-w-xs">
          <CampoNumero
            rotulo="Até quantos pontos abaixo da média"
            valor={c.margemMaxima}
            min={0}
            dica="Em branco: sem limite."
            onChange={(n) =>
              setRegra({
                ...regra,
                conselhoDeClasse: { ...c, margemMaxima: Number.isNaN(n) ? null : n },
              })
            }
          />
        </div>
      ) : null}
    </>
  );
}
