import { describe, expect, it } from 'vitest';
import { CriarLeadRequestSchema, VERSAO_POLITICA_LEAD } from '../lead';

const base = { consentimento: true, versaoPolitica: VERSAO_POLITICA_LEAD, website: '' };

describe('CriarLeadRequestSchema', () => {
  it('aceita o contato da home e normaliza o e-mail', () => {
    const r = CriarLeadRequestSchema.parse({
      origem: 'contato',
      nome: '  Ana Clara ',
      email: ' ANA@Escola.COM.BR ',
      perfil: 'gestor',
      ...base,
    });
    expect(r).toMatchObject({ nome: 'Ana Clara', email: 'ana@escola.com.br' });
  });

  it('aceita a demonstração da escola e a lista de espera da faculdade', () => {
    expect(
      CriarLeadRequestSchema.safeParse({ origem: 'demo', nome: 'B', instituicao: 'Colégio X', email: 'b@x.com', ...base }).success,
    ).toBe(true);
    expect(
      CriarLeadRequestSchema.safeParse({ origem: 'espera', nome: 'C', faculdadeCurso: 'UFX, Pedagogia', email: 'c@x.edu.br', ...base })
        .success,
    ).toBe(true);
  });

  it('exige a autorização LGPD marcada', () => {
    const r = CriarLeadRequestSchema.safeParse({ origem: 'contato', nome: 'A', email: 'a@a.com', perfil: 'aluno', ...base, consentimento: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.consentimento?.[0]).toMatch(/autorização/);
  });

  it('diz o que corrigir em cada campo', () => {
    const r = CriarLeadRequestSchema.safeParse({ origem: 'demo', nome: '', instituicao: '', email: 'sem-arroba', ...base });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = r.error.flatten().fieldErrors as Record<string, string[]>;
      expect(e.nome?.[0]).toBe('Informe seu nome.');
      expect(e.instituicao?.[0]).toBe('Informe o nome da instituição.');
      expect(e.email?.[0]).toMatch(/nome@instituicao\.com\.br/);
    }
  });

  it('não promove perfil fora da lista nem origem desconhecida', () => {
    expect(CriarLeadRequestSchema.safeParse({ origem: 'contato', nome: 'A', email: 'a@a.com', perfil: 'admin', ...base }).success).toBe(false);
    expect(CriarLeadRequestSchema.safeParse({ origem: 'outra', nome: 'A', email: 'a@a.com', ...base }).success).toBe(false);
  });

  it('deixa a isca passar, para a API descartar em silêncio', () => {
    const r = CriarLeadRequestSchema.parse({ origem: 'contato', nome: 'A', email: 'a@a.com', perfil: 'aluno', ...base, website: 'http://spam' });
    expect(r.website).toBe('http://spam');
  });
});
