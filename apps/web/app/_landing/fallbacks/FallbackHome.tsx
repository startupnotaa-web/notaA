import { NotaASimbolo } from '@notaa/ui';

// Arte estática da home (a do 3D, parada): o cubo com o símbolo, duas órbitas e losangos. Vale antes do
// carregamento, com movimento reduzido, sem WebGL e em aparelho fraco. Sem animação.

const FACE =
  'absolute inset-0 flex items-center justify-center rounded-[24px] border-[1.5px] border-[color:color-mix(in_srgb,var(--brand-violet)_45%,transparent)] bg-[linear-gradient(145deg,var(--surface),var(--violet-tint))]';
const ORBITA = 'absolute left-1/2 top-1/2 rounded-full border-[1.5px] border-dashed [transform:rotateX(90deg)]';
const LOSANGO =
  'absolute rotate-45 rounded-[22%] bg-[linear-gradient(135deg,var(--brand-cyan),var(--brand-violet)_60%,var(--brand-magenta))]';

export function FallbackHome() {
  return (
    <div className="absolute inset-0 overflow-hidden [perspective:1500px] [perspective-origin:50%_38%]">
      <span className={`${LOSANGO} left-[6%] top-[8%] h-14 w-14`} />
      <span className={`${LOSANGO} right-[8%] top-[14%] h-7 w-7 opacity-80`} />
      <span className={`${LOSANGO} bottom-[8%] right-[14%] h-10 w-10 opacity-85`} />
      <span className={`${LOSANGO} bottom-[14%] left-[12%] h-[22px] w-[22px] opacity-70`} />
      {/* O palco é desenhado em 560px de largura e reduzido no celular. */}
      <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(-16deg)_scale(0.62)] md:[transform:rotateX(-16deg)]">
        <span
          className={`${ORBITA} -ml-[280px] -mt-[280px] h-[560px] w-[560px] border-[color:color-mix(in_srgb,var(--brand-violet)_45%,transparent)]`}
        />
        <span
          className={`${ORBITA} -ml-[380px] -mt-[380px] h-[760px] w-[760px] border-[color:color-mix(in_srgb,var(--brand-cyan)_35%,transparent)]`}
        />
        <div className="absolute left-1/2 top-1/2 -ml-[75px] -mt-[75px] h-[150px] w-[150px] [transform-style:preserve-3d] [transform:rotateX(-22deg)_rotateY(32deg)]">
          {['[transform:translateZ(75px)]', '[transform:rotateY(90deg)_translateZ(75px)]', '[transform:rotateY(180deg)_translateZ(75px)]', '[transform:rotateY(-90deg)_translateZ(75px)]'].map((t) => (
            <div key={t} className={`${FACE} ${t}`}>
              <NotaASimbolo className="h-auto w-[84px]" />
            </div>
          ))}
          <div className={`${FACE} [transform:rotateX(90deg)_translateZ(75px)]`} />
          <div className={`${FACE} [transform:rotateX(-90deg)_translateZ(75px)]`} />
        </div>
      </div>
    </div>
  );
}
