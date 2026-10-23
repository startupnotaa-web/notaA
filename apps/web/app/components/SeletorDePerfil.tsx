'use client';

import { Menu, Notice } from '@notaa/ui';
import type { Papel } from '@notaa/contracts';
import { mesmoContexto } from '@notaa/contracts';
import { useContextoDeAcesso } from '../../lib/contexto-de-acesso-provider';

const COMO: Record<Papel, string> = {
  estudante: 'Aluno',
  professor_institucional: 'Professor',
  professor_independente: 'Professor',
  admin_instituicao: 'Gestão',
  responsavel: 'Responsável',
  admin: 'Administração',
};

/**
 * "Trocar de acesso" na barra superior: instituições em que a pessoa atua, ou alunos de quem cuida.
 * Só aparece com 2 ou mais; com um acesso só, não há o que escolher. A troca passa pelo servidor
 * (que confere o vínculo e registra só os ids) e recarrega a tela no acesso novo.
 */
export function SeletorDePerfil() {
  const { contextos, atual, aviso, trocando, erroDeTroca, trocar, dispensarAviso } = useContextoDeAcesso();
  if (contextos.length < 2 || !atual) return null;

  return (
    <div className="flex items-center gap-space-2">
      <Menu
        label={`${COMO[atual.papel]} · ${atual.rotulo}`}
        // Começa pelo texto visível (WCAG 2.5.3, rótulo no nome acessível).
        ariaLabel={`${COMO[atual.papel]} · ${atual.rotulo}. Trocar de acesso`}
        variant="quiet"
        items={contextos.map((c) => ({
          id: `${c.instituicaoId ?? ''}:${c.estudanteId ?? ''}`,
          label: c.rotulo,
          checked: mesmoContexto(c, atual),
          disabled: trocando,
          onSelect: () => {
            if (!mesmoContexto(c, atual)) void trocar(c);
          },
        }))}
      />
      {erroDeTroca ? (
        <span role="alert" className="text-caption text-danger">
          {erroDeTroca}
        </span>
      ) : null}
      {aviso ? (
        <Notice tone="warning" className="fixed inset-x-4 top-space-4 z-50 mx-auto max-w-md">
          {aviso}{' '}
          <button type="button" className="font-bold underline" onClick={dispensarAviso}>
            Entendi
          </button>
        </Notice>
      ) : null}
    </div>
  );
}
