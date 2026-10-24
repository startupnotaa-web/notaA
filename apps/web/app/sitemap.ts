import type { MetadataRoute } from 'next';
import { juridicoCompleto } from '../lib/juridico';
import { URL_DO_SITE } from '../lib/site';

// Só as páginas públicas. As telas autenticadas (painéis, estudo) não entram.
// Privacidade e termos só entram quando os dados da empresa estiverem preenchidos (lib/juridico.ts).
const LEGAIS = ['/privacidade', '/termos'];
const CAMINHOS = ['/', '/aluno', '/professores', '/escola', '/faculdade', ...(juridicoCompleto() ? LEGAIS : [])];

export default function sitemap(): MetadataRoute.Sitemap {
  return CAMINHOS.map((caminho) => ({
    url: new URL(caminho, URL_DO_SITE).toString(),
    changeFrequency: caminho === '/privacidade' || caminho === '/termos' ? 'yearly' : 'monthly',
    priority: caminho === '/' ? 1 : 0.7,
  }));
}
