'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  quantidadeDePeriodos,
  RegraAvaliativaSchema,
  type AnoLetivo,
  type ModoRecuperacao,
  type RegraAvaliativa as Regra,
  type RegraAvaliativaVersao,
} from '@notaa/contracts';
import { Badge, Button, Card, CardContent, Input, Label, OptionCard, Skeleton, Stepper, Switch, Table } from '@notaa/ui';
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
  const tituloEtapa = useRef<HTMLHeadingElement>(null);
  const somenteLeitura = anoLetivo.arquivado;

  const carregar = useCallback(
    async (preencher: boolean) => {
      try {
        const lista = await apiFetch<RegraAvaliativaVersao[]>(`/academico/regras?anoLetivoId=${anoLetivo.id}`);
        setVersoes(lista);
        if (preencher) setRegra((lista.find((v) => v.ativa) ?? lista[0])?.regra ?? REGRA_PADRAO);
      } catch (e) {
        toast(e instanceof ApiError ? e.message : 'Não foi possível carregar as regras.', { variant: 'error' });
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
    setSalvando(true);
    try {
      const criada = await apiFetch<RegraAvaliativaVersao>('/academico/regras', {
        method: 'POST',
        body: JSON.stringify({ anoLetivoId: anoLetivo.id, regra: validacao.data }),
      });
      toast(`Versão ${criada.versao} salva. Ative-a para que passe a valer.`, { variant: 'success' });
      await carregar(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Não foi possível salvar a regra.', { variant: 'error' });
    } finally {
      setSalvando(false);
    }
  }

  async function ativar(v: RegraAvaliativaVersao) {
    try {
      await apiFetch<RegraAvaliativaVersao>(`/academico/regras/${v.id}/ativar`, { method: 'POST' });
      toast(`Versão ${v.versao} ativada.`, { variant: 'success' });
      await carregar(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Não foi possível ativar a versão.', { variant: 'error' });
    }
  }

  const erros = errosPorEtapa.get(etapa) ?? [];
  const periodos = quantidadeDePeriodos(regra.regime);

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Stepper passos={ETAPAS} atual={etapa} onIrPara={irPara} aria-label="Etapas da regra avaliativa" />

          <Card>
            <CardContent className="space-y-6 pt-6">
              <h2 ref={tituloEtapa} tabIndex={-1} className="text-xl font-bold text-text focus:outline-none">
                {etapa + 1}. {ETAPAS[etapa]}
              </h2>
              <fieldset disabled={somenteLeitura} className="space-y-6">
                <legend className="sr-only">{ETAPAS[etapa]}</legend>
                {etapa === 0 ? <EtapaRegime regra={regra} setRegra={setRegra} /> : null}
                {etapa === 1 ? <EtapaEscala regra={regra} setRegra={setRegra} /> : null}
                {etapa === 2 ? <EtapaNotaPeriodo regra={regra} setRegra={setRegra} /> : null}
                {etapa === 3 ? <EtapaMediaFinal regra={regra} setRegra={setRegra} periodos={periodos} /> : null}
                {etapa === 4 ? <EtapaArredondamento regra={regra} setRegra={setRegra} /> : null}
                {etapa === 5 ? <EtapaRecuperacao regra={regra} setRegra={setRegra} /> : null}
                {etapa === 6 ? <EtapaAprovacao regra={regra} setRegra={setRegra} /> : null}
                {etapa === 7 ? <EtapaConselho regra={regra} setRegra={setRegra} /> : null}
              </fieldset>

              {erros.length ? (
                <ul role="alert" className="space-y-1 rounded-md border border-error p-3 text-sm text-error">
                  {erros.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <Button variant="secondary" onClick={() => irPara(etapa - 1)} disabled={etapa === 0}>
                  Voltar
                </Button>
                {etapa < ETAPAS.length - 1 ? (
                  <Button onClick={() => irPara(etapa + 1)}>Próxima: {ETAPAS[etapa + 1]}</Button>
                ) : (
                  <Button onClick={() => void salvar()} disabled={salvando || somenteLeitura}>
                    {salvando ? 'Salvando…' : 'Salvar como nova versão'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside aria-label="Simulador" className="lg:sticky lg:top-20 lg:self-start">
          <SimuladorRegra regra={regra} valida={validacao.success} />
        </aside>
      </div>

      <section aria-labelledby="titulo-versoes" className="space-y-3">
        <h2 id="titulo-versoes" className="text-lg font-bold text-text">
          Versões da regra em {anoLetivo.rotulo}
        </h2>
        {versoes === null ? (
          <Skeleton className="h-24 w-full" />
        ) : versoes.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhuma versão salva ainda.</p>
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
                  <td className="font-semibold text-text">v{v.versao}</td>
                  <td>{new Date(v.criadoEm).toLocaleString('pt-BR')}</td>
                  <td>{v.criadoPor.nome ?? '—'}</td>
                  <td>{v.ativa ? <Badge variant="success">Vigente</Badge> : <Badge variant="neutral">Inativa</Badge>}</td>
                  <td className="space-x-2 whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" onClick={() => setRegra(v.regra)}>
                      Abrir no formulário<span className="sr-only"> (versão {v.versao})</span>
                    </Button>
                    {!v.ativa && !somenteLeitura ? (
                      <Button variant="secondary" size="sm" onClick={() => void ativar(v)}>
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
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={valor ?? ''}
        min={min}
        max={max}
        step={step}
        aria-describedby={dica ? `${id}-dica` : undefined}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      />
      {dica ? (
        <p id={`${id}-dica`} className="text-xs text-text-muted">
          {dica}
        </p>
      ) : null}
    </div>
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
              setRegra(comRegime(regra, o.tipo === 'personalizado' ? { tipo: o.tipo, quantidade: 5 } : { tipo: o.tipo }))
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
          onClick={() => setRegra({ ...regra, escala: { tipo: 'conceitos', maximo: 10, faixas: FAIXAS_PADRAO } })}
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
          onClick={() => setRegra({ ...regra, notaPeriodo: { tipo: 'media_ponderada', pesos: [1, 2] } })}
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
          <p className="text-sm text-text-muted">Um peso por avaliação, na ordem em que são lançadas.</p>
          <div className="flex flex-wrap items-end gap-3">
            {pesos.map((p, i) => (
              <div key={i} className="w-28">
                <CampoNumero
                  rotulo={`Avaliação ${i + 1}`}
                  valor={p}
                  min={0.1}
                  onChange={(v) =>
                    setRegra({ ...regra, notaPeriodo: { tipo: 'media_ponderada', pesos: pesos.map((x, j) => (j === i ? v : x)) } })
                  }
                />
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              disabled={pesos.length >= 20}
              onClick={() => setRegra({ ...regra, notaPeriodo: { tipo: 'media_ponderada', pesos: [...pesos, 1] } })}
            >
              Adicionar avaliação
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pesos.length <= 1}
              onClick={() => setRegra({ ...regra, notaPeriodo: { tipo: 'media_ponderada', pesos: pesos.slice(0, -1) } })}
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
      <p className="text-sm text-text-muted">
        Peso de cada período na média final. Pesos iguais dão a média aritmética. Exemplo comum: 2, 2, 3 e 3.
      </p>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: periodos }, (_, i) => (
          <div key={i} className="w-28">
            <CampoNumero
              rotulo={`${i + 1}º período`}
              valor={pesos[i] ?? null}
              min={0.1}
              onChange={(v) => setRegra({ ...regra, mediaFinal: { pesosPorPeriodo: pesos.map((x, j) => (j === i ? v : x)) } })}
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
          onClick={() => setRegra({ ...regra, arredondamento: { tipo: 'meio_ponto', modo: 'proximo' } })}
        />
        <OptionCard
          title="Meio ponto, sempre acima"
          description="6,1 vira 6,5; 6,6 vira 7,0"
          selected={a.tipo === 'meio_ponto' && a.modo === 'acima'}
          onClick={() => setRegra({ ...regra, arredondamento: { tipo: 'meio_ponto', modo: 'acima' } })}
        />
      </Opcoes>
      {a.tipo !== 'meio_ponto' ? (
        <Opcoes legenda="Casas decimais">
          {([0, 1, 2] as const).map((c) => (
            <OptionCard
              key={c}
              title={c === 0 ? 'Sem casas decimais' : `${c} casa${c > 1 ? 's' : ''} decimal${c > 1 ? 'is' : ''}`}
              selected={a.casas === c}
              onClick={() => setRegra({ ...regra, arredondamento: { tipo: a.tipo, casas: c } })}
            />
          ))}
        </Opcoes>
      ) : null}
      <p className="text-sm text-text-muted">Vale para a nota de cada período, a média final e as recuperações.</p>
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
          <h3 className="font-semibold text-text">Recuperação paralela (por período)</h3>
          <Switch
            checked={paralela !== null}
            aria-label="Recuperação paralela"
            onCheckedChange={(ligada) => set({ final, paralela: ligada ? { modo: 'maior' } : null })}
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
      <div className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-text">Recuperação final (depois da média)</h3>
          <Switch
            checked={final !== null}
            aria-label="Recuperação final"
            onCheckedChange={(ligada) =>
              set({
                paralela,
                final: ligada
                  ? { modo: 'media', mediaMinimaParaAcesso: null, mediaMinimaAposRecuperacao: regra.aprovacao.mediaMinima - 1 }
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
                onChange={(n) => set({ paralela, final: { ...final, mediaMinimaParaAcesso: Number.isNaN(n) ? null : n } })}
              />
              <CampoNumero
                rotulo="Média para aprovar depois da final"
                valor={final.mediaMinimaAposRecuperacao}
                min={0}
                onChange={(n) => set({ paralela, final: { ...final, mediaMinimaAposRecuperacao: n } })}
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
    </div>
  );
}

function EtapaConselho({ regra, setRegra }: PropsEtapa) {
  const c = regra.conselhoDeClasse;
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-text">Conselho de classe pode aprovar</h3>
          <p className="text-sm text-text-muted">Decide sobre quem ficou abaixo da média. Nunca sobre falta.</p>
        </div>
        <Switch
          checked={c.habilitado}
          aria-label="Conselho de classe pode aprovar"
          onCheckedChange={(habilitado) => setRegra({ ...regra, conselhoDeClasse: { ...c, habilitado } })}
        />
      </div>
      {c.habilitado ? (
        <div className="max-w-xs">
          <CampoNumero
            rotulo="Até quantos pontos abaixo da média"
            valor={c.margemMaxima}
            min={0}
            dica="Em branco: sem limite."
            onChange={(n) => setRegra({ ...regra, conselhoDeClasse: { ...c, margemMaxima: Number.isNaN(n) ? null : n } })}
          />
        </div>
      ) : null}
    </>
  );
}
