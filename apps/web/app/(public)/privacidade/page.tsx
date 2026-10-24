import { VERSAO_POLITICA_LEAD } from '@notaa/contracts';
import { PaginaLegal } from '../../_landing/componentes/PaginaLegal';
import { DADOS_JURIDICOS, juridicoCompleto } from '../../../lib/juridico';
import { metadadosDaPagina } from '../../../lib/site';

// A CSP com nonce (middleware.ts) exige HTML gerado por requisição.
export const dynamic = 'force-dynamic';

const completa = juridicoCompleto();

export const metadata = metadadosDaPagina({
  titulo: 'Política de privacidade do Nota A',
  descricao: 'Como o Nota A trata os dados enviados nos formulários de contato, demonstração e lista de espera.',
  caminho: '/privacidade',
  imagem: 'home',
  semIndexacao: !completa,
});

// O que está aqui descreve o que os formulários da landing fazem hoje (packages/contracts/src/lead.ts e
// apps/api/src/modules/lead). Os dados da empresa vêm de lib/juridico.ts; sem eles a página não publica o texto.
export default function Privacidade() {
  if (!completa) {
    return (
      <PaginaLegal titulo="Política de privacidade">
        <p>Esta página ainda não está disponível. Volte em breve.</p>
      </PaginaLegal>
    );
  }

  const d = DADOS_JURIDICOS;
  return (
    <PaginaLegal titulo="Política de privacidade" atualizacao={`Versão ${VERSAO_POLITICA_LEAD}`}>
      <section>
        <h2>Quem é o responsável pelos dados</h2>
        <p>
          {d.razaoSocial}, CNPJ {d.cnpj}, {d.endereco}. Contato do encarregado de dados: {d.encarregadoNome}, {d.encarregadoEmail}.
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
          Os dados ficam em banco de dados com acesso restrito à equipe do Nota A. Prazo de guarda: {d.prazoRetencaoLeads}.
          Provedores que tratam os dados em nosso nome: {d.operadores}.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>
          Você pode pedir confirmação do tratamento, acesso, correção e eliminação dos seus dados, e retirar a autorização a
          qualquer momento, como prevê a Lei Geral de Proteção de Dados (Lei 13.709/2018). Canal para pedidos:{' '}
          {d.canalDosTitulares}. Prazo de resposta: {d.prazoRespostaTitulares}.
        </p>
      </section>

      <section>
        <h2>Menores de idade</h2>
        <p>{d.regraMenores}</p>
      </section>
    </PaginaLegal>
  );
}
