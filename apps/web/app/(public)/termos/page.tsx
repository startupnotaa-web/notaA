import { PaginaLegal } from '../../_landing/componentes/PaginaLegal';
import { DADOS_JURIDICOS, juridicoCompleto } from '../../../lib/juridico';
import { metadadosDaPagina } from '../../../lib/site';

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição.
export const dynamic = 'force-dynamic';

const completa = juridicoCompleto();

export const metadata = metadadosDaPagina({
  titulo: 'Termos de uso do Nota A',
  descricao: 'Termos de uso do Nota A.',
  caminho: '/termos',
  imagem: 'home',
  semIndexacao: !completa,
});

// As cláusulas vêm de lib/juridico.ts (textoDasClausulas), aprovadas pelo jurídico. Sem elas a página não publica.
export default function Termos() {
  if (!completa) {
    return (
      <PaginaLegal titulo="Termos de uso">
        <p>Esta página ainda não está disponível. Volte em breve.</p>
      </PaginaLegal>
    );
  }

  const d = DADOS_JURIDICOS;
  return (
    <PaginaLegal titulo="Termos de uso" atualizacao={`Versão ${d.versaoTermos}`}>
      <section>
        <h2>Quem oferece o Nota A</h2>
        <p>
          {d.razaoSocial}, CNPJ {d.cnpj}, {d.endereco}. Contato: {d.canalDeContato}.
        </p>
      </section>
      <section>
        <h2>Como a plataforma funciona</h2>
        <p>
          O Nota A reúne ambientes para aluno, professor, escola e, em breve, faculdade. A faculdade ainda não está disponível.
          Médias, frequência e situação do aluno seguem regras fixas; a IA ajuda a explicar e a sugerir estudo, e não decide
          média nem situação. A nota estimada do ENEM é uma estimativa e não substitui o resultado oficial.
        </p>
      </section>
      <section>
        <h2>Cláusulas</h2>
        <p>{d.textoDasClausulas}</p>
      </section>
      <section>
        <h2>Privacidade</h2>
        <p>
          O tratamento de dados pessoais está descrito na <a className="font-bold text-primary underline underline-offset-4" href="/privacidade">política de privacidade</a>.
        </p>
      </section>
    </PaginaLegal>
  );
}
