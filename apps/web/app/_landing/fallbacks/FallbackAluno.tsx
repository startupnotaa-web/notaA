// Arte estática do aluno: a trilha isométrica parada, com os primeiros ladrilhos acesos, e a moeda.
// Vale antes do carregamento, com movimento reduzido, sem WebGL e em aparelho fraco.

const LADRILHOS = [
  { x: 30, y: 400, aceso: true },
  { x: 150, y: 400, aceso: true },
  { x: 150, y: 280, aceso: true },
  { x: 270, y: 280, aceso: true },
  { x: 270, y: 160, aceso: true },
  { x: 390, y: 160, aceso: false },
  { x: 390, y: 40, aceso: false },
];

// Posições em classes (o HTML da landing não leva style="…"): cada coordenada da trilha vira um par left/top arbitrário.
const POSICAO: Record<string, string> = {
  '30,400': 'left-[30px] top-[400px]',
  '150,400': 'left-[150px] top-[400px]',
  '150,280': 'left-[150px] top-[280px]',
  '270,280': 'left-[270px] top-[280px]',
  '270,160': 'left-[270px] top-[160px]',
  '390,160': 'left-[390px] top-[160px]',
  '390,40': 'left-[390px] top-[40px]',
};

export function FallbackAluno() {
  return (
    <div className="absolute inset-0 overflow-hidden [perspective:1600px]">
      <div className="absolute inset-0 [transform:scale(0.62)] md:[transform:none]">
        <div className="absolute left-1/2 top-[52%] -ml-[260px] -mt-[260px] h-[520px] w-[520px] [transform-style:preserve-3d] [transform:rotateX(58deg)_rotateZ(-34deg)]">
          <div className="absolute -inset-[30px] rounded-[40px] border-2 border-dashed border-[color:var(--amb-line)] bg-[radial-gradient(circle_at_50%_50%,color-mix(in_srgb,var(--amb-cyan)_28%,transparent),color-mix(in_srgb,var(--brand-violet)_12%,transparent)_60%,transparent_75%)]" />
          {LADRILHOS.map((l) => (
            <div key={`${l.x},${l.y}`} className={`absolute h-[92px] w-[92px] [transform-style:preserve-3d] ${POSICAO[`${l.x},${l.y}`]}`}>
              <div className="absolute inset-0 rounded-[20px] bg-amb-bg-deep" />
              <div
                className={`absolute inset-0 rounded-[20px] border-2 [transform:translateZ(22px)] ${
                  l.aceso
                    ? 'border-[color:var(--amb-line)] bg-amb-accent shadow-[0_0_30px_color-mix(in_srgb,var(--amb-accent)_70%,transparent)]'
                    : 'border-[color:var(--amb-line)] bg-amb-bg-2'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute right-[14%] top-[8%] flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-[color:color-mix(in_srgb,var(--amb-sun)_70%,var(--surface))] bg-amb-sun font-pesada text-[30px] font-extrabold leading-none text-amb-on-accent shadow-[inset_0_-6px_0_color-mix(in_srgb,var(--amb-bg)_35%,transparent)]">
        A
      </div>
    </div>
  );
}
