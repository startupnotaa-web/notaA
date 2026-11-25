'use client';

import { useState } from 'react';
import type { ContextoListado, Papel } from '@notaa/contracts';
import { mesmoContexto, type ContextoDeAcesso } from '@notaa/contracts';
import { Button, Notice, OptionCard } from '@notaa/ui';
import { AuthPagina } from './auth';

const COMO: Record<Papel, string> = {
  estudante: 'Como aluno',
  professor_institucional: 'Como professor',
  professor_independente: 'Como professor',
  admin_instituicao: 'Na gestão da instituição',
  responsavel: 'Como responsável',
  admin: 'Na administração',
};

/**
 * "Entrar como…": aparece depois do login quando a conta tem mais de um acesso. O último usado vem
 * marcado e primeiro. Escolher confirma no servidor; só segue se ele reconhecer o vínculo.
 */
export function EscolherContexto({
  contextos,
  lembrado,
  aoEscolher,
}: {
  contextos: readonly ContextoListado[];
  lembrado: ContextoDeAcesso | null;
  aoEscolher: (contexto: ContextoListado) => Promise<void>;
}) {
  const ordenados = [...contextos].sort((a, b) => Number(!!lembrado && mesmoContexto(b, lembrado)) - Number(!!lembrado && mesmoContexto(a, lembrado)));
  const [marcado, setMarcado] = useState<ContextoListado>(ordenados[0]!);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function continuar() {
    setEnviando(true);
    setErro(null);
    try {
      await aoEscolher(marcado);
    } catch {
      setErro('Não foi possível entrar com esse acesso. Tente de novo ou escolha outro.');
      setEnviando(false);
    }
  }

  return (
    <AuthPagina
      titulo="Entrar como…"
      descricao="Sua conta tem mais de um acesso. Escolha por onde começar; dá para trocar depois, pelo topo da tela."
    >
      <div role="radiogroup" aria-label="Acessos da sua conta" className="flex flex-col gap-space-3">
        {ordenados.map((c) => {
          const ehLembrado = !!lembrado && mesmoContexto(c, lembrado);
          return (
            <OptionCard
              key={`${c.instituicaoId ?? ''}:${c.estudanteId ?? ''}`}
              selected={mesmoContexto(c, marcado)}
              title={c.rotulo}
              description={ehLembrado ? `${COMO[c.papel]} · último acesso` : COMO[c.papel]}
              onClick={() => setMarcado(c)}
              disabled={enviando}
            />
          );
        })}
      </div>
      {erro ? <Notice tone="danger">{erro}</Notice> : null}
      <Button type="button" variant="primary" className="w-full" loading={enviando} onClick={() => void continuar()}>
        {enviando ? 'Entrando' : 'Continuar'}
      </Button>
    </AuthPagina>
  );
}
