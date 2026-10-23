import type { MetadataRoute } from 'next';
import { URL_DO_SITE } from '../lib/site';

// Só as páginas públicas. As telas autenticadas (painéis, estudo) não entram.
const CAMINHOS = ['/', '/aluno', '/professores', '/escola', '/faculdade', '/privacidade', '/termos'];

export default function sitemap(): MetadataRoute.Sitemap {
  return CAMINHOS.map((caminho) => ({
    url: new URL(caminho, URL_DO_SITE).toString(),
    changeFrequency: caminho === '/privacidade' || caminho === '/termos' ? 'yearly' : 'monthly',
    priority: caminho === '/' ? 1 : 0.7,
  }));
}
