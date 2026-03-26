import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../services/authService';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleLogin = () => {
    const user = getSession();
    if (user) {
      navigate('/home');
    } else {
      navigate('/login');
    }
  };

  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  return (
    <div className="landing-container">
      
      <header className="landing-header">
        <div className="header-content">
          <div className="logo">
            <h1>BARBER<span>ONE</span></h1>
            <small>by AD Tech Solutions</small>
          </div>
          <nav className="nav-menu">
            <a href="#sobre">Quem Somos</a>
            <a href="#solucoes">Soluções</a>
            <a href="#planos">Planos</a>
            <button onClick={handleLogin} className="btn-login">Acessar Sistema</button>
          </nav>
        </div>
      </header>

     
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-content">
            <h1>Gestão Completa,<br/>Corte Perfeito</h1>
            <p>Plataforma tecnológica de gestão e agendamento para barbearias.
               Automatize processos, controle finanças e escale seu negócio.</p>
            <div className="lp-">
              <button onClick={() => document.getElementById('planos').scrollIntoView({behavior: 'smooth'})}
                      className="btn-primary">
                Começar Agora
              </button>
              <button onClick={handleLogin} className="btn-secondary">
                Já tenho conta
              </button>
            </div>
          </div>
          <div className="lp-hero-image">
            <div className="barber-illustration">
              <span className="scissors-icon">✂️</span>
              <div className="chart-icon">📊</div>
            </div>
          </div>
        </div>
      </section>

    
      <section className="problems-section">
        <div className="lp-container">
          <h2>O Problema do Mercado</h2>
          <div className="problems-grid">
            <div className="problem-card">
              <span className="icon">📱</span>
              <h3>Agendamentos Desorganizados</h3>
              <p>WhatsApp sem controle e falta de gestão de horários</p>
            </div>
            <div className="problem-card">
              <span className="icon">💰</span>
              <h3>Falta de Controle Financeiro</h3>
              <p>Dificuldade no cálculo de comissões e caixa</p>
            </div>
            <div className="problem-card">
              <span className="icon">⚠️</span>
              <h3>Cancelamentos sem Controle</h3>
              <p>Ausência de gestão de recorrência e relatórios</p>
            </div>
          </div>
          <div className="result-box">
            <strong>Resultado:</strong> Perda de clientes e desorganização operacional e financeira
          </div>
        </div>
      </section>


      <section id="solucoes" className="solution-section">
        <div className="lp-container">
          <h2>Solução Proposta</h2>
          <p className="section-subtitle">A BARBERONE é uma plataforma completa desenvolvida pela AD Tech Solution Ltda</p>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">🔄</div>
              <h3>Gestão de Assinaturas</h3>
              <p>Mensais e anuais automatizadas</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💵</div>
              <h3>Controle Financeiro</h3>
              <p>Completo e intuitivo</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💈</div>
              <h3>Comissões de Barbeiros</h3>
              <p>Controle individual automático</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🛍️</div>
              <h3>Venda de Produtos</h3>
              <p>Serviços adicionais integrados</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔐</div>
              <h3>Permissões de Acesso</h3>
              <p>Por nível de usuário</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📈</div>
              <h3>Relatórios Estratégicos</h3>
              <p>Para tomada de decisão</p>
            </div>
          </div>
        </div>
      </section>

 
      <section id="sobre" className="differentials-section">
        <div className="lp-container">
          <h2>Nossos Diferenciais</h2>
          <div className="diff-grid">
            <div className="diff-card">
              <h3>🎯 Personalização</h3>
              <p>Soluções sob medida para necessidades específicas da sua barbearia</p>
            </div>
            <div className="diff-card">
              <h3>🚀 Tecnologia de Ponta</h3>
              <p>Ferramentas inovadoras com sistema de recorrência automatizada</p>
            </div>
            <div className="diff-card">
              <h3>🎧 Suporte Contínuo</h3>
              <p>Acompanhamento em todas as etapas com manutenção e sustentação</p>
            </div>
          </div>
        </div>
      </section>


      <section id="planos" className="pricing-section">
        <div className="lp-container">
          <h2>Planos Comerciais</h2>
          <div className="pricing-grid">
            <div className="pricing-card basic">
              <div className="card-header">
                <h3>Plano Básico</h3>
                <span className="subtitle">Ideal para barbearias iniciantes</span>
              </div>
              <div className="price">
                <span className="currency">R$</span>
                <span className="amount">89,90</span>
                <span className="period">/mês</span>
              </div>
              <ul className="features-list">
                <li>✓ Cadastro de até 2 barbeiros</li>
                <li>✓ 1 Administrativo (Recepção)</li>
                <li>✓ 1 Administrador</li>
                <li>✓ Agendamento online</li>
                <li>✓ Cadastro de clientes</li>
                <li>✓ Pagamentos avulsos</li>
                <li>✓ Assinaturas recorrentes</li>
                <li>✓ Suporte via e-mail</li>
              </ul>
              <button onClick={() => handleSubscribe('basic')} className="btn-plan basic-btn">
                Assinar Plano Básico
              </button>
            </div>

            <div className="pricing-card premium">
              <div className="recommended-badge">MAIS POPULAR</div>
              <div className="card-header">
                <h3>Plano Premium</h3>
                <span className="subtitle">Para barbearias que querem crescer</span>
              </div>
              <div className="price">
                <span className="currency">R$</span>
                <span className="amount">139,90</span>
                <span className="period">/mês</span>
              </div>
              <ul className="features-list">
                <li>✓ Tudo do Plano Básico +</li>
                <li>✓ Barbeiros ilimitados</li>
                <li>✓ Classificação de profissionais</li>
                <li>✓ 2 Administradores</li>
                <li>✓ Avaliações de clientes</li>
                <li>✓ Painel financeiro completo</li>
                <li>✓ Relatórios financeiros avançados</li>
                <li>✓ Gestão de planos e recorrência</li>
                <li>✓ Controle de comissões</li>
                <li>✓ Sistema personalizado</li>
                <li>✓ Notificações</li>
                <li>✓ Suporte via e-mail e WhatsApp</li>
              </ul>
              <button onClick={() => handleSubscribe('premium')} className="btn-plan premium-btn">
                Assinar Plano Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="process-section">
        <div className="lp-container">
          <h2>Nosso Processo</h2>
          <div className="process-steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Diagnóstico</h3>
              <p>Análise aprofundada do seu cenário atual e definição de metas</p>
            </div>
            <div className="arrow">→</div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Planejamento</h3>
              <p>Criação de um plano estratégico personalizado</p>
            </div>
            <div className="arrow">→</div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Execução</h3>
              <p>Implementação das soluções com treinamento da equipe</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="lp-container">
          <h2>Vamos conversar?</h2>
          <p>Agende uma reunião para discutir como podemos ajudar a alcançar seus objetivos</p>
          <button onClick={handleLogin} className="btn-cta">Acessar Sistema</button>
          <div className="social-links">
            <a href="https://instagram.com/adtechsolutions_ltda" target="_blank" rel="noopener noreferrer">
              @adtechsolutions_ltda
            </a>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="lp-container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>BARBER<span>ONE</span></h3>
              <p>Gestão completa, corte perfeito.</p>
            </div>
            <div className="footer-links">
              <a href="https://www.barberoneapp.com" target="_blank" rel="noopener noreferrer">
                www.barberoneapp.com
              </a>
            </div>
          </div>
          <div className="copyright">
            © 2026 AD Tech Solution Ltda. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Assinar Plano {selectedPlan === 'basic' ? 'Básico' : 'Premium'}</h3>
            <p>Para assinar este plano, você precisa fazer login ou criar uma conta.</p>
            <div className="modal-buttons">
              <button onClick={handleLogin} className="btn-primary">Fazer Login</button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;