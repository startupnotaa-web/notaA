'use client';
import { Menu } from '@notaa/ui';
import { useContextoDoPainel } from '../../lib/contexto-do-painel';

/** Ano letivo e turma de trabalho, na barra superior. Some se a pessoa não tem nenhum ano nem turma. */
export function SeletorDeContexto() {
  const { anos, turmas, anoLetivoId, turmaId, escolherAno, escolherTurma } = useContextoDoPainel();
  if (anos.length === 0 && turmas.length === 0) return null;

  const ano = anos.find((a) => a.id === anoLetivoId);
  const turmasDoAno = turmas.filter((t) => !anoLetivoId || t.anoLetivo.id === anoLetivoId);
  const turma = turmasDoAno.find((t) => t.id === turmaId);

  return (
    <div className="flex items-center gap-space-2">
      {anos.length > 0 ? (
        <Menu
          label={`Ano ${ano?.rotulo ?? '—'}`}
          // Começa pelo texto visível (WCAG 2.5.3).
          ariaLabel={`Ano ${ano?.rotulo ?? '—'}. Trocar o ano letivo`}
          variant="quiet"
          items={anos.map((a) => ({
            id: a.id,
            label: `${a.rotulo}${a.arquivado ? ' (arquivado)' : ''}`,
            checked: a.id === anoLetivoId,
            onSelect: () => escolherAno(a.id),
          }))}
        />
      ) : null}
      {turmasDoAno.length > 0 ? (
        <Menu
          label={turma?.nome ?? 'Todas as turmas'}
          ariaLabel={`${turma?.nome ?? 'Todas as turmas'}. Trocar a turma`}
          variant="quiet"
          items={[
            { id: 'todas', label: 'Todas as turmas', checked: !turmaId, onSelect: () => escolherTurma('') },
            ...turmasDoAno.map((t) => ({ id: t.id, label: t.nome, checked: t.id === turmaId, onSelect: () => escolherTurma(t.id) })),
          ]}
        />
      ) : null}
    </div>
  );
}
