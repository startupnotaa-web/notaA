import { Placeholder } from '../../_landing/componentes/Marcador';
import { PaginaLegal } from '../../_landing/componentes/PaginaLegal';
import { metadadosDaPagina } from '../../../lib/site';

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição.
export const dynamic = 'force-dynamic';

export const metadata = metadadosDaPagina({
  titulo: 'Termos de uso do Nota A',
  descricao: 'Termos de uso do Nota A.',
  caminho: '/termos',
  imagem: 'home',
});

// Rascunho: estrutura sem conteúdo jurídico inventado. Tudo que é cláusula depende do jurídico.
export default function Termos() {
  return (
    <PaginaLegal titulo="Termos de uso" atualizacao="Rascunho, sem versão numerada">
      <section>
        <h2>Quem oferece o Nota A</h2>
        <p>
          <Placeholder nota="razão social, CNPJ e endereço" />.
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
        <p>
          Cadastro e conta, uso aceitável, planos e pagamento, propriedade intelectual, limitação de responsabilidade,
          rescisão e foro: <Placeholder nota="redação do jurídico para cada cláusula" />.
        </p>
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
