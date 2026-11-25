import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // A página de fallback precisa estar no cache antes de a conexão cair.
  additionalPrecacheEntries: [
    { url: '/offline', revision: 'v1' },
    // Aplica o tema antes da pintura; sem ele em cache a página offline piscaria no tema errado.
    { url: '/theme-init.js', revision: 'v1' },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @notaa/ui e @notaa/contracts — garante transpilação mesmo sem dist/ prévio.
  transpilePackages: ['@notaa/ui', '@notaa/contracts'],
};

export default withSerwist(nextConfig);
