// Arte estática da escola: a grade em perspectiva (parada) e três folhas em carrossel, na pose do 3D.
// Os números das folhas são de exemplo e a arte é decorativa.

const FOLHA =
  'absolute -left-[150px] -top-[200px] flex h-[400px] w-[300px] flex-col gap-2.5 rounded-[12px] bg-amb-surface px-[22px] py-[22px] font-text text-[14px] leading-5 text-amb-ink shadow-[0_30px_60px_color-mix(in_srgb,var(--amb-navy-deep)_55%,transparent)] [backface-visibility:hidden]';
const LINHA = 'flex items-center gap-2.5 border-t border-amb-line py-[7px]';
const SELO = 'inline-flex rounded-pill px-2.5 text-[12.5px] font-bold leading-[19px]';

export function FallbackGradeEscola() {
  return (
    <div
      aria-hidden="true"
      className="absolute -inset-x-[10%] -bottom-10 h-[380px] origin-bottom [transform:perspective(500px)_rotateX(62deg)] bg-[linear-gradient(color-mix(in_srgb,var(--amb-accent-light)_22%,transparent)_1.5px,transparent_1.5px),linear-gradient(90deg,color-mix(in_srgb,var(--amb-accent-light)_22%,transparent)_1.5px,transparent_1.5px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_top,black_20%,transparent_95%)]"
    />
  );
}

export function FallbackEscola() {
  return (
    <div className="absolute inset-0 overflow-hidden [perspective:1700px] [perspective-origin:50%_35%]">
      <div className="absolute inset-0 [transform:scale(0.55)] md:[transform:none]">
        <div className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d] [transform:rotateX(-8deg)_rotateY(-24deg)]">
          <div className={`${FOLHA} [transform:rotateY(0deg)_translateZ(330px)]`}>
            <h4 className="m-0 font-display text-[17px] font-semibold leading-6 text-amb-navy">Regra de avaliação</h4>
            <div className={LINHA}><span className="flex-1">Prova</span><strong>peso 5</strong></div>
            <div className={LINHA}><span className="flex-1">Trabalho</span><strong>peso 3</strong></div>
            <div className={LINHA}><span className="flex-1">Participação</span><strong>peso 2</strong></div>
            <div className={LINHA}><span className="flex-1">Média de aprovação</span><strong>6,0</strong></div>
            <span className={`${SELO} self-start bg-amb-accent-tint text-amb-accent-hover`}>Versão 3, vigente</span>
          </div>
          <div className={`${FOLHA} [transform:rotateY(120deg)_translateZ(330px)]`}>
            <h4 className="m-0 font-display text-[17px] font-semibold leading-6 text-amb-navy">Boletim do 3º trimestre</h4>
            <div className={LINHA}><span className="flex-1">Matemática</span><strong>7,4</strong><span className={`${SELO} bg-success-tint text-success`}>Aprovada</span></div>
            <div className={LINHA}><span className="flex-1">Física</span><strong>5,8</strong><span className={`${SELO} bg-warning-tint text-warning`}>Recuperação</span></div>
            <div className={LINHA}><span className="flex-1">História</span><strong>7,9</strong><span className={`${SELO} bg-success-tint text-success`}>Aprovada</span></div>
            <span className={`${SELO} self-start bg-success-tint text-success`}>Publicado</span>
          </div>
          <div className={`${FOLHA} [transform:rotateY(240deg)_translateZ(330px)]`}>
            <h4 className="m-0 font-display text-[17px] font-semibold leading-6 text-amb-navy">Importação de planilha</h4>
            <div className={LINHA}><span className="flex-1">Alunos novos</span><strong>252</strong></div>
            <div className={LINHA}><span className="flex-1">Atualizados</span><strong>28</strong></div>
            <div className={LINHA}><span className="flex-1">Com erro</span><strong>20</strong></div>
            <span className="text-amb-ink-muted">Corrija as linhas com erro e importe de novo.</span>
            <span className={`${SELO} self-start bg-danger-tint text-danger`}>20 linhas para revisar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
