'use client';

import Link from 'next/link';
import { useId, useRef, useState, type FormEvent } from 'react';
import { cn } from '@notaa/ui';
import { LEAD_SCHEMAS, VERSAO_POLITICA_LEAD, type LeadOrigem } from '@notaa/contracts';

export interface CampoDoLead {
  nome: string;
  rotulo: string;
  tipo: 'text' | 'email' | 'select';
  autoComplete?: string;
  opcoes?: { valor: string; rotulo: string }[];
}

/** Classes de cada ambiente: o formulário é o mesmo, a roupa muda. */
export interface EstiloDoFormulario {
  formulario: string;
  rotulo: string;
  controle: string;
  erro: string;
  botao: string;
  consentimento: string;
  link: string;
  sucesso: string;
}

export interface FormularioLeadProps {
  origem: LeadOrigem;
  campos: CampoDoLead[];
  /** Texto do botão. O verbo é o da ação ("Agendar demonstração"). */
  botao: string;
  /** Frase da autorização LGPD que antecede o link da política. */
  consentimento: string;
  /** Resultado do envio, com o mesmo nome da ação do botão ("Demonstração agendada"). */
  sucesso: { titulo: string; texto: string };
  estilo: EstiloDoFormulario;
}

type Estado = 'ocioso' | 'enviando' | 'enviado';

const MSG_REDE = 'Não foi possível enviar agora. Confira sua conexão e tente de novo.';
const MSG_LIMITE = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e envie de novo.';
const MSG_INVALIDO = 'Algum campo não passou na conferência. Revise as respostas e envie de novo.';
const MSG_INDISPONIVEL = 'Não foi possível enviar agora. Tente de novo em alguns minutos.';

/** Junta a base da API com o caminho deixando exatamente uma barra entre eles. */
function urlDaApi(caminho: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  return `${base}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}

/**
 * Formulário de lead (contato, demonstração, lista de espera).
 *
 * Valida com o mesmo schema Zod da API (@notaa/contracts) antes de enviar. A API valida de novo: a conferência
 * do navegador existe para dizer o que corrigir, não para proteger. Nada é guardado no navegador, nada vai
 * para analytics e nada é registrado em console.
 */
export function FormularioLead({ origem, campos, botao, consentimento, sucesso, estilo }: FormularioLeadProps) {
  const base = useId();
  const [estado, setEstado] = useState<Estado>('ocioso');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const aviso = useRef<HTMLDivElement>(null);

  const idDe = (nome: string) => `${base}-${nome}`;

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (estado === 'enviando') return;
    setErroGeral(null);

    const dados = new FormData(e.currentTarget);
    const texto = (nome: string) => String(dados.get(nome) ?? '');
    const bruto = {
      origem,
      ...Object.fromEntries(campos.map((c) => [c.nome, texto(c.nome)])),
      consentimento: dados.get('consentimento') === 'on',
      versaoPolitica: VERSAO_POLITICA_LEAD,
      website: texto('website'),
    };

    const resultado = LEAD_SCHEMAS[origem].safeParse(bruto);
    if (!resultado.success) {
      const porCampo: Record<string, string> = {};
      for (const [nome, mensagens] of Object.entries(resultado.error.flatten().fieldErrors)) {
        if (mensagens?.[0]) porCampo[nome] = mensagens[0];
      }
      setErros(porCampo);
      // Foco no primeiro campo com erro, na ordem em que aparecem na tela.
      const primeiro = [...campos.map((c) => c.nome), 'consentimento'].find((n) => porCampo[n]);
      if (primeiro) formulario.current?.querySelector<HTMLElement>(`[name="${primeiro}"]`)?.focus();
      return;
    }
    setErros({});

    setEstado('enviando');
    try {
      const resposta = await fetch(urlDaApi('/leads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultado.data),
      });
      if (resposta.status === 202) {
        setEstado('enviado');
        // Quem usa leitor de tela precisa ouvir o resultado: o foco vai para o aviso.
        requestAnimationFrame(() => aviso.current?.focus());
        return;
      }
      setErroGeral(
        resposta.status === 429 ? MSG_LIMITE : resposta.status === 400 ? MSG_INVALIDO : MSG_INDISPONIVEL,
      );
    } catch {
      setErroGeral(MSG_REDE);
    }
    setEstado('ocioso');
  }

  if (estado === 'enviado') {
    return (
      <div className={estilo.formulario}>
        <div ref={aviso} role="status" tabIndex={-1} className={cn(estilo.sucesso, 'outline-none')}>
          <p className="font-display text-heading-3">{sucesso.titulo}</p>
          <p className="mt-2 font-text text-body">{sucesso.texto}</p>
        </div>
      </div>
    );
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate className={estilo.formulario}>
      {campos.map((c) => {
        const id = idDe(c.nome);
        const erro = erros[c.nome];
        const comum = {
          id,
          name: c.nome,
          required: true,
          'aria-invalid': erro ? (true as const) : undefined,
          'aria-describedby': erro ? `${id}-erro` : undefined,
          className: estilo.controle,
        };
        return (
          <div key={c.nome} className="flex flex-col gap-2">
            <label htmlFor={id} className={estilo.rotulo}>
              {c.rotulo}
            </label>
            {c.tipo === 'select' ? (
              <select {...comum} defaultValue={c.opcoes?.[0]?.valor}>
                {c.opcoes?.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            ) : (
              <input {...comum} type={c.tipo} autoComplete={c.autoComplete} />
            )}
            {erro ? (
              <p id={`${id}-erro`} className={estilo.erro}>
                {erro}
              </p>
            ) : null}
          </div>
        );
      })}

      {/* Isca para robô: escondida da vista, fora da ordem de tabulação e sem rótulo para quem usa leitor de tela. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label>
          Não preencha este campo
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={idDe('consentimento')} className={estilo.consentimento}>
          <input
            id={idDe('consentimento')}
            type="checkbox"
            name="consentimento"
            required
            aria-invalid={erros.consentimento ? true : undefined}
            aria-describedby={erros.consentimento ? `${idDe('consentimento')}-erro` : undefined}
            className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--amb-accent,var(--primary))]"
          />
          <span>
            {consentimento}{' '}
            <Link href="/privacidade" target="_blank" rel="noopener" className={estilo.link}>
              política de privacidade
              <span className="sr-only"> (abre em nova aba)</span>
            </Link>
            .
          </span>
        </label>
        {erros.consentimento ? (
          <p id={`${idDe('consentimento')}-erro`} className={estilo.erro}>
            {erros.consentimento}
          </p>
        ) : null}
      </div>

      {erroGeral ? (
        <p role="alert" className={estilo.erro}>
          {erroGeral}
        </p>
      ) : null}

      <button type="submit" disabled={estado === 'enviando'} className={estilo.botao}>
        {estado === 'enviando' ? 'Enviando…' : botao}
      </button>
    </form>
  );
}
