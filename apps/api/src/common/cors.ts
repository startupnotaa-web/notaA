// Política de CORS ÚNICA da API (auditoria E12): main.ts (Node local) e
// api/index.ts (function serverless da Vercel) importam DAQUI — antes cada
// entry point tinha sua própria cópia e elas já haviam divergido (previews da
// Vercel funcionavam num ambiente e falhavam no outro).

const ALLOWED_ORIGINS = [
  'https://notaa.com.br',
  'https://www.notaa.com.br',
  'http://localhost:3000',
];

// Previews da Vercel via regex ANCORADA (`^…$`) — uma versão frouxa
// (`/\.vercel\.app$/`) casaria domínios como `evil-vercel.app.attacker.com`.
const VERCEL_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

export const CORS_OPTIONS = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Sem origem (SSR/curl), domínio oficial explícito, ou preview da Vercel.
    if (!origin || ALLOWED_ORIGINS.includes(origin) || VERCEL_PREVIEW_RE.test(origin)) {
      callback(null, true);
    } else {
      callback(null, false); // não bloqueia com erro (evita crash) — só omite os headers CORS
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-development-mode',
    'Accept',
    'idempotency-key',
    'Idempotency-Key',
  ],
  credentials: true,
};
