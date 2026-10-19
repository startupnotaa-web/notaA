// Arte estática da faculdade: dois cubos de arame (um grande vazado, um pequeno cheio), parados na pose do 3D.

const ARAME = 'absolute inset-0 border-[1.5px] border-amb-accent bg-[color-mix(in_srgb,var(--amb-accent)_4%,transparent)]';
const CHEIO = 'absolute inset-0 border-[1.5px] border-amb-ink bg-[color-mix(in_srgb,var(--amb-ink)_90%,transparent)]';

const FACES = [
  '[transform:translateZ(var(--z))]',
  '[transform:rotateY(90deg)_translateZ(var(--z))]',
  '[transform:rotateY(180deg)_translateZ(var(--z))]',
  '[transform:rotateY(-90deg)_translateZ(var(--z))]',
  '[transform:rotateX(90deg)_translateZ(var(--z))]',
  '[transform:rotateX(-90deg)_translateZ(var(--z))]',
];

export function FallbackFaculdade() {
  return (
    <div className="absolute inset-0 overflow-hidden [perspective:1400px] [perspective-origin:50%_40%]">
      <div className="absolute inset-0 [transform:scale(0.75)] md:[transform:none]">
        <div className="absolute left-1/2 top-1/2 -ml-[120px] -mt-[120px] h-[240px] w-[240px] [--z:120px] [transform-style:preserve-3d] [transform:rotateX(-24deg)_rotateY(35deg)]">
          {FACES.map((f) => (
            <div key={f} className={`${ARAME} ${f}`} />
          ))}
        </div>
        <div className="absolute left-1/2 top-1/2 -ml-[65px] -mt-[65px] h-[130px] w-[130px] [--z:65px] [transform-style:preserve-3d] [transform:rotateX(18deg)_rotateY(-20deg)_rotateZ(10deg)]">
          {FACES.map((f) => (
            <div key={f} className={`${CHEIO} ${f}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
