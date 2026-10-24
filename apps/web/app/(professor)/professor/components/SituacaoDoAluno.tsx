import { Chip } from '@notaa/ui';

type RiskLevel = 'alto' | 'medio' | 'baixo';

const TOM = { alto: 'danger', medio: 'warning', baixo: 'success' } as const;
const ROTULO = { alto: 'Risco alto', medio: 'Atenção', baixo: 'Em dia' } as const;

/** Nível de risco do aluno: cor, ícone e palavra juntos, nunca só a cor. */
export function SituacaoDoAluno({ risco, className }: { risco: RiskLevel; className?: string }) {
  return (
    <Chip tone={TOM[risco]} className={className}>
      {ROTULO[risco]}
    </Chip>
  );
}
