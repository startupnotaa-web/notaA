// Arte estática do professor: três painéis empilhados (turma, notas, agenda), parados na pose do 3D.
// Os dados são de exemplo e a arte é decorativa.

const CAMADA =
  'absolute inset-0 flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-amb-line bg-amb-surface px-5 py-[18px] font-text text-[13px] leading-[18px] text-amb-ink shadow-[0_30px_50px_color-mix(in_srgb,var(--amb-ink)_18%,transparent)]';
const LINHA = 'flex items-center gap-2.5 border-t border-amb-line py-1.5';
const SELO = 'inline-flex rounded-pill px-[9px] text-[12px] font-bold leading-[18px]';

export function FallbackProfessores() {
  return (
    <div className="absolute inset-0 overflow-hidden [perspective:1700px]">
      <div className="absolute inset-0 [transform:scale(0.72)] md:[transform:none]">
        <div className="absolute left-1/2 top-1/2 -ml-[200px] -mt-[135px] h-[270px] w-[400px] [transform-style:preserve-3d] [transform:rotateX(58deg)_rotateZ(-30deg)]">
          <div className={CAMADA}>
            <h4 className="m-0 font-display text-[15px] font-semibold leading-5">Turma 2º ano B</h4>
            <div className={LINHA}><span className="flex-1">Ana Clara</span><span className={`${SELO} bg-success-tint text-success`}>Presente</span></div>
            <div className={LINHA}><span className="flex-1">Bruno Lima</span><span className={`${SELO} bg-success-tint text-success`}>Presente</span></div>
            <div className={LINHA}><span className="flex-1">Carla Dias</span><span className={`${SELO} bg-danger-tint text-danger`}>Faltou</span></div>
          </div>
          <div className={`${CAMADA} [transform:translateZ(70px)]`}>
            <h4 className="m-0 font-display text-[15px] font-semibold leading-5">Notas do bimestre</h4>
            <div className={LINHA}><span className="flex-1">Prova 1</span><strong>7,5</strong></div>
            <div className={LINHA}><span className="flex-1">Trabalho</span><strong>8,0</strong></div>
            <div className={LINHA}><span className="flex-1">Média</span><strong className="text-amb-accent">7,8</strong></div>
          </div>
          <div className={`${CAMADA} [transform:translateZ(140px)]`}>
            <h4 className="m-0 font-display text-[15px] font-semibold leading-5">Agenda da semana</h4>
            <div className={LINHA}><span className="flex-[0_0_52px] font-bold">Seg 19h</span><span className="flex-1 rounded-md bg-amb-amber-tint px-2.5 py-1">Revisão de funções</span></div>
            <div className={LINHA}><span className="flex-[0_0_52px] font-bold">Qua 19h</span><span className="flex-1">Aula 12</span></div>
            <div className={LINHA}><span className="flex-[0_0_52px] font-bold">Sex 18h</span><span className="flex-1">Plantão de dúvidas</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
