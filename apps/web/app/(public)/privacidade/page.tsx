import { VERSAO_POLITICA_LEAD } from '@notaa/contracts';
import { Placeholder } from '../../_landing/componentes/Marcador';
import { PaginaLegal } from '../../_landing/componentes/PaginaLegal';
import { metadadosDaPagina } from '../../../lib/site';

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição.
export const dynamic = 'force-dynamic';

export const metadata = metadadosDaPagina({
  titulo: 'Política de privacidade do Nota A',
  descricao: 'Como o Nota A trata os dados enviados nos formulários de contato, demonstração e lista de espera.',
  caminho: '/privacidade',
  imagem: 'home',
});

// Rascunho. O que está aqui descreve o que os formulários da landing fazem hoje (packages/contracts/src/lead.ts e
// apps/api/src/modules/lead). O que depende de fato fora do repositório fica como placeholder visível.
export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de privacidade" atualizacao={`Versão ${VERSAO_POLITICA_LEAD}`}>
      <section>
        <h2>Quem é o responsável pelos dados</h2>
        <p>
          <Placeholder nota="razão social, CNPJ e endereço do controlador" />. Contato do encarregado de dados:{' '}
          <Placeholder nota="nome e e-mail do encarregado (DPO)" />.
        </p>
      </section>

      <section>
        <h2>Quais dados os formulários pedem</h2>
        <ul>
          <li>Formulário de contato da página inicial: nome, e-mail e o perfil que você escolhe (aluno, professor, gestor ou faculdade).</li>
          <li>Pedido de demonstração, na página da escola: nome, instituição e e-mail de trabalho.</li>
          <li>Lista de espera, na página da faculdade: nome, faculdade e curso, e e-mail institucional.</li>
        </ul>
        <p className="mt-2">
          Guardamos também o momento em que você marcou a autorização e a versão desta política que estava no ar. Não guardamos
          o seu endereço de rede: para limitar envios em excesso, usamos apenas um código derivado dele, que não permite
          recuperar o endereço.
        </p>
      </section>

      <section>
        <h2>Para que usamos esses dados</h2>
        <p>
          Para responder ao seu pedido: indicar o ambiente do Nota A que combina com você, combinar uma demonstração ou avisar
          sobre o módulo Faculdade. Não usamos esses dados para outra finalidade. Os formulários não enviam seus dados a
          ferramentas de análise nem de publicidade.
        </p>
      </section>

      <section>
        <h2>Base legal</h2>
        <p>
          O seu consentimento, que você dá ao marcar a caixa de autorização em cada formulário. Sem a caixa marcada, o
          formulário não é enviado.
        </p>
      </section>

      <section>
        <h2>Onde ficam e por quanto tempo</h2>
        <p>
          Os dados ficam em banco de dados com acesso restrito à equipe do Nota A. Prazo de guarda:{' '}
          <Placeholder nota="prazo de retenção dos leads" />. Provedores que tratam os dados em nosso nome:{' '}
          <Placeholder nota="lista de operadores e país de armazenamento" />.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>
          Você pode pedir confirmação do tratamento, acesso, correção e eliminação dos seus dados, e retirar a autorização a
          qualquer momento, como prevê a Lei Geral de Proteção de Dados (Lei 13.709/2018). Canal para pedidos:{' '}
          <Placeholder nota="e-mail ou formulário de pedidos do titular" />. Prazo de resposta:{' '}
          <Placeholder nota="prazo de resposta" />.
        </p>
      </section>

      <section>
        <h2>Menores de idade</h2>
        <p>
          Estes formulários são para quem tem 18 anos ou mais. <Placeholder nota="regra para menores de 18 anos nos formulários" />.
        </p>
      </section>
    </PaginaLegal>
  );
}
