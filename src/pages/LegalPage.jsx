import { Link } from 'react-router-dom';
import './LegalPage.css';

const privacySections = [
  {
    title: '1. Dados que coletamos',
    content:
      'O BarberOne pode coletar dados informados diretamente pelo usuario, como nome, e-mail, telefone, dados de login, dados da barbearia, dados de profissionais, clientes e informacoes relacionadas a agendamentos.',
  },
  {
    title: '2. Dados de agendamentos e operacao',
    content:
      'Para operar a plataforma, podemos tratar informacoes sobre servicos escolhidos, datas, horarios, profissionais, status do atendimento, historico de agendamentos, produtos, assinaturas, pagamentos e registros financeiros vinculados ao uso do sistema.',
  },
  {
    title: '3. Login com Google',
    content:
      'Quando o usuario utiliza o login com Google, o BarberOne usa as informacoes fornecidas pelo Google apenas para autenticar o acesso, identificar a conta e permitir a entrada segura na plataforma. O BarberOne nao usa o login com Google para acessar conteudos pessoais que nao sejam necessarios para autenticacao.',
  },
  {
    title: '4. Como usamos os dados',
    content:
      'Os dados sao utilizados para cadastro, acesso a conta, gestao de agendamentos, administracao da barbearia, comunicacao com usuarios e clientes, processamento de pagamentos, suporte, seguranca e operacao da plataforma.',
  },
  {
    title: '5. Compartilhamento de dados',
    content:
      'Podemos compartilhar dados somente quando necessario para prestacao do servico, como provedores de hospedagem, autenticacao, pagamentos, comunicacao e ferramentas operacionais. Tambem poderemos compartilhar dados quando exigido por lei ou autoridade competente.',
  },
  {
    title: '6. Seguranca e retencao',
    content:
      'Adotamos medidas tecnicas e organizacionais para proteger os dados contra acessos nao autorizados, perda, uso indevido ou alteracao. Os dados sao mantidos pelo tempo necessario para cumprir as finalidades da plataforma, obrigacoes legais e interesses legitimos.',
  },
  {
    title: '7. Direitos do usuario',
    content:
      'O usuario pode solicitar acesso, correcao, atualizacao ou exclusao de seus dados, observadas as obrigacoes legais e necessidades operacionais da plataforma.',
  },
  {
    title: '8. Contato',
    content:
      'Duvidas sobre esta Politica de Privacidade podem ser encaminhadas pelos canais oficiais de atendimento do BarberOne ou da AD Tech Solution Ltda.',
  },
];

const termsSections = [
  {
    title: '1. Uso da plataforma',
    content:
      'O BarberOne e uma plataforma para gestao de barbearias, incluindo cadastro de usuarios, profissionais e clientes, agendamentos, servicos, produtos, assinaturas, pagamentos e informacoes operacionais.',
  },
  {
    title: '2. Conta e responsabilidades do usuario',
    content:
      'O usuario deve fornecer informacoes verdadeiras, manter seus dados atualizados e proteger suas credenciais de acesso. O uso da conta e de responsabilidade do titular, incluindo atividades realizadas por pessoas autorizadas pela barbearia.',
  },
  {
    title: '3. Agendamentos',
    content:
      'Os agendamentos realizados na plataforma devem refletir horarios, servicos e profissionais disponiveis. Cancelamentos, remarcacoes, atrasos e regras comerciais sao definidos pela barbearia responsavel pelo atendimento.',
  },
  {
    title: '4. Pagamentos',
    content:
      'Pagamentos, assinaturas e cobrancas podem ser processados por provedores externos integrados ao BarberOne. O usuario e responsavel por conferir valores, formas de pagamento, status das transacoes e politicas comerciais aplicaveis.',
  },
  {
    title: '5. Seguranca',
    content:
      'E proibido tentar acessar areas restritas sem autorizacao, interferir no funcionamento da plataforma, explorar falhas, compartilhar acessos indevidamente ou usar o sistema para fins ilicitos.',
  },
  {
    title: '6. Disponibilidade do sistema',
    content:
      'Trabalhamos para manter a plataforma disponivel e estavel, mas o acesso pode ser interrompido temporariamente por manutencao, atualizacoes, falhas tecnicas, indisponibilidade de terceiros ou eventos fora do controle razoavel do BarberOne.',
  },
  {
    title: '7. Alteracoes nos termos',
    content:
      'Estes Termos de Servico podem ser atualizados periodicamente para refletir melhorias da plataforma, mudancas legais ou ajustes operacionais. A continuidade de uso apos alteracoes representa concordancia com os termos atualizados.',
  },
  {
    title: '8. Contato',
    content:
      'Duvidas sobre estes Termos de Servico podem ser encaminhadas pelos canais oficiais de atendimento do BarberOne ou da AD Tech Solution Ltda.',
  },
];

const pageContent = {
  privacy: {
    eyebrow: 'Privacidade',
    title: 'Politica de Privacidade',
    description:
      'Esta Politica de Privacidade explica como o BarberOne coleta, usa e protege dados pessoais no contexto de um sistema de gestao e agendamento para barbearias.',
    updatedAt: 'Atualizada em 7 de maio de 2026',
    sections: privacySections,
  },
  terms: {
    eyebrow: 'Termos',
    title: 'Termos de Servico',
    description:
      'Estes Termos de Servico apresentam as principais regras para uso do BarberOne por barbearias, profissionais, administradores e usuarios da plataforma.',
    updatedAt: 'Atualizados em 7 de maio de 2026',
    sections: termsSections,
  },
};

export default function LegalPage({ type }) {
  const content = pageContent[type] || pageContent.privacy;

  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="legal-header__inner">
          <Link to="/" className="legal-logo" aria-label="Voltar ao inicio">
            <span className="legal-logo__word">
              BARBER<span>ONE</span>
            </span>
            <small>by AD Tech Solutions</small>
          </Link>

          <nav className="legal-actions" aria-label="Navegacao legal">
            <Link to="/" className="legal-link">
              Inicio
            </Link>
            <Link to="/login" className="legal-button">
              Acessar sistema
            </Link>
          </nav>
        </div>
      </header>

      <main className="legal-main">
        <section className="legal-hero">
          <p className="legal-eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          <span>{content.updatedAt}</span>
        </section>

        <section className="legal-card" aria-label={content.title}>
          <div className="legal-sections">
            {content.sections.map((section) => (
              <article key={section.title} className="legal-section">
                <h2>{section.title}</h2>
                <p>{section.content}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
