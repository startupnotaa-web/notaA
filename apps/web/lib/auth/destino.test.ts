import { describe, expect, it } from 'vitest';
import type { Papel } from '@notaa/contracts';
import {
  caminhoInternoSeguro,
  decidirAcesso,
  HOME_POR_PAPEL,
  papeisDaRota,
  papelConhecido,
  papelPodeAbrir,
  resolverDestino,
} from './destino';

const PAPEIS: Papel[] = ['estudante', 'professor_institucional', 'professor_independente', 'admin_instituicao', 'responsavel', 'admin'];

describe('resolverDestino: home por papel', () => {
  it.each([
    ['estudante', '/dashboard'],
    ['professor_institucional', '/professor'],
    ['professor_independente', '/professor'],
    ['admin_instituicao', '/instituicao'],
    ['responsavel', '/responsavel'],
    ['admin', '/admin'],
  ] as const)('%s sem next vai para %s', (papel, esperado) => {
    expect(resolverDestino({ papel })).toBe(esperado);
    expect(HOME_POR_PAPEL[papel]).toBe(esperado);
  });

  it('sem papel volta ao login, nunca ao hub do aluno', () => {
    expect(resolverDestino({ papel: null })).toBe('/login');
    expect(resolverDestino({ papel: null }, '/dashboard')).toBe('/login');
  });
});

describe('resolverDestino: next', () => {
  // [papel, next, esperado]
  const tabela: ReadonlyArray<readonly [Papel, string | null | undefined, string]> = [
    // do próprio perfil: respeita, com query e subcaminho
    ['estudante', '/simulado', '/simulado'],
    ['estudante', '/quiz?area=matematica', '/quiz?area=matematica'],
    ['professor_institucional', '/professor', '/professor'],
    ['professor_independente', '/professor?turma=1', '/professor?turma=1'],
    ['admin_instituicao', '/instituicao/academico', '/instituicao/academico'],
    ['admin_instituicao', '/instituicao/importacao#passo-2', '/instituicao/importacao#passo-2'],
    ['responsavel', '/responsavel', '/responsavel'],
    ['admin', '/admin', '/admin'],
    ['professor_institucional', '/perfil', '/perfil'],
    // de outro perfil: home do próprio
    ['estudante', '/instituicao', '/dashboard'],
    ['estudante', '/professor', '/dashboard'],
    ['professor_institucional', '/dashboard', '/professor'],
    ['professor_institucional', '/instituicao', '/professor'],
    ['admin_instituicao', '/dashboard', '/instituicao'],
    ['admin_instituicao', '/professor', '/instituicao'],
    ['responsavel', '/dashboard', '/responsavel'],
    ['responsavel', '/instituicao', '/responsavel'],
    ['admin', '/dashboard', '/admin'],
    ['admin', '/instituicao', '/admin'],
    // rota que o app não conhece: fechada por padrão
    ['estudante', '/login', '/dashboard'],
    ['estudante', '/cadastro', '/dashboard'],
    ['admin_instituicao', '/rota-que-nao-existe', '/instituicao'],
    // prefixo parecido não é a mesma rota
    ['estudante', '/dashboardx', '/dashboard'],
    ['professor_institucional', '/professores', '/professor'],
    // ausente ou vazio
    ['professor_institucional', undefined, '/professor'],
    ['professor_institucional', null, '/professor'],
    ['professor_institucional', '', '/professor'],
  ];

  it.each(tabela)('%s com next %j vai para %s', (papel, next, esperado) => {
    expect(resolverDestino({ papel }, next)).toBe(esperado);
  });
});

describe('open redirect', () => {
  const VETORES = [
    '//evil.com',
    '///evil.com',
    '////evil.com/x',
    '/\\evil.com',
    '\\\\evil.com',
    '\\/evil.com',
    '/\\/evil.com',
    'https://evil.com',
    'http://evil.com/dashboard',
    'HTTPS://EVIL.COM',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.com/dashboard',
    '%2f%2fevil.com',
    '/%2fevil.com',
    '/%5cevil.com',
    '/%09/evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/%0d%0aLocation: https://evil.com',
    '/dashboard\r\nSet-Cookie: x=1',
    ' //evil.com',
    '/dashboard%',
    'dashboard',
    'evil.com',
    '?next=/dashboard',
    '#/dashboard',
    `/${'a'.repeat(600)}`,
  ];

  it.each(VETORES)('recusa %j', (vetor) => {
    expect(caminhoInternoSeguro(vetor)).toBeNull();
  });

  it.each(PAPEIS)('para %s, vetor malicioso vira a home do perfil', (papel) => {
    for (const vetor of VETORES) {
      expect(resolverDestino({ papel }, vetor)).toBe(HOME_POR_PAPEL[papel]);
    }
  });

  it('normaliza ../ para dentro do app e depois confere a permissão', () => {
    expect(caminhoInternoSeguro('/professor/../dashboard')).toBe('/dashboard');
    expect(resolverDestino({ papel: 'professor_institucional' }, '/professor/../dashboard')).toBe('/professor');
    expect(resolverDestino({ papel: 'estudante' }, '/professor/../dashboard')).toBe('/dashboard');
  });

  it('aceita caminho interno comum', () => {
    expect(caminhoInternoSeguro('/instituicao/academico?ano=2026#topo')).toBe('/instituicao/academico?ano=2026#topo');
  });
});

describe('papelPodeAbrir', () => {
  it('rota desconhecida é fechada para todos', () => {
    for (const papel of PAPEIS) expect(papelPodeAbrir(papel, '/nao-existe')).toBe(false);
  });

  it('cada home pertence ao próprio papel', () => {
    for (const papel of PAPEIS) expect(papelPodeAbrir(papel, HOME_POR_PAPEL[papel])).toBe(true);
  });

  it('nenhuma home é aberta por um papel que não é dela, exceto /professor para o admin da plataforma', () => {
    for (const papel of PAPEIS) {
      for (const outro of PAPEIS) {
        if (HOME_POR_PAPEL[outro] === HOME_POR_PAPEL[papel]) continue;
        const esperado = papel === 'admin' && HOME_POR_PAPEL[outro] === '/professor';
        expect(papelPodeAbrir(papel, HOME_POR_PAPEL[outro])).toBe(esperado);
      }
    }
  });
});

describe('papelConhecido', () => {
  it('só devolve papéis do app', () => {
    expect(papelConhecido('estudante')).toBe('estudante');
    expect(papelConhecido('instituicao')).toBeNull();
    expect(papelConhecido('__proto__')).toBeNull();
    expect(papelConhecido('toString')).toBeNull();
    expect(papelConhecido(undefined)).toBeNull();
    expect(papelConhecido(42)).toBeNull();
  });
});

describe('decidirAcesso: o guarda decide pelo papel do token', () => {
  const sessao = (papelNoToken: unknown) => ({ carregando: false, temSessao: true, papelNoToken });

  it('enquanto carrega, espera; sem sessão, manda entrar', () => {
    expect(decidirAcesso({ carregando: true, temSessao: false, papelNoToken: undefined }, ['estudante'])).toEqual({ estado: 'carregando' });
    expect(decidirAcesso({ carregando: false, temSessao: false, papelNoToken: undefined }, ['estudante'])).toEqual({ estado: 'sem-sessao' });
  });

  it('professor na área do professor: ok; na do aluno e na da instituição: negado (nunca "vira aluno")', () => {
    expect(decidirAcesso(sessao('professor_institucional'), papeisDaRota('/professor'))).toEqual({ estado: 'ok', papel: 'professor_institucional' });
    expect(decidirAcesso(sessao('professor_institucional'), papeisDaRota('/dashboard'))).toEqual({ estado: 'negado', papel: 'professor_institucional' });
    expect(decidirAcesso(sessao('professor_institucional'), papeisDaRota('/instituicao'))).toEqual({ estado: 'negado', papel: 'professor_institucional' });
  });

  it('papel ausente ou inventado no token é "sem papel", não aluno', () => {
    expect(decidirAcesso(sessao(undefined), papeisDaRota('/dashboard'))).toEqual({ estado: 'sem-papel' });
    expect(decidirAcesso(sessao('superusuario'), papeisDaRota('/dashboard'))).toEqual({ estado: 'sem-papel' });
  });

  it('rota fora do mapa nega a todos', () => {
    for (const papel of PAPEIS) expect(decidirAcesso(sessao(papel), papeisDaRota('/nao-existe')).estado).toBe('negado');
  });
});
