import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @notaa/ui exporta TS/TSX cru (main: src/index.ts) — o Next precisa transpilá-lo.
  transpilePackages: ['@notaa/ui'],
};

export default withSerwist(nextConfig);
