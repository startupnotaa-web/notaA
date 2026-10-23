import type { MetadataRoute } from 'next';
import { URL_DO_SITE } from '../lib/site';

// Em preview e em branch o site inteiro fica fora dos buscadores (as páginas também saem com noindex).
const emProducao = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production';

export default function robots(): MetadataRoute.Robots {
  if (!emProducao) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Telas de quem entrou na conta: não há nada público nelas.
      disallow: ['/instituicao', '/professor', '/dashboard', '/onboarding', '/offline'],
    },
    sitemap: new URL('/sitemap.xml', URL_DO_SITE).toString(),
  };
}
