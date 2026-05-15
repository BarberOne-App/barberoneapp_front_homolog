import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MessageCircle,
  Scissors,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  getRedirectPath,
  hasValidSession,
  registerBarbershopFromLanding,
} from '../services/authService';
import barberOneLogo from '../assets/barberOne-logo.png';
import './LandingPage.css';

const PLAN_LABELS = {
  basic: 'Plano Básico',
  premium: 'Plano Premium',
  master: 'Plano Master',
};

const PAYMENT_LINKS = {
  basic: 'https://buy.stripe.com/test_fZucN65vRcI07OU0i2awo01',
  premium: 'https://buy.stripe.com/test_14A8wQ9M7gYgedi1m6awo00',
};

const painPoints = [
  {
    icon: MessageCircle,
    title: 'Agenda espalhada',
    text: 'Mensagens no WhatsApp, remarcações e horários livres difíceis de acompanhar.',
  },
  {
    icon: Wallet,
    title: 'Caixa sem clareza',
    text: 'Comissões, assinaturas e pagamentos avulsos ficam separados da operação.',
  },
  {
    icon: Clock,
    title: 'Tempo perdido',
    text: 'A equipe gasta energia com tarefas repetitivas em vez de atender melhor.',
  },
];

const features = [
  { icon: CalendarCheck, title: 'Agendamento online', text: 'Clientes escolhem serviço, barbeiro e horário em poucos passos.' },
  { icon: Wallet, title: 'Financeiro integrado', text: 'Pagamentos, comissões e recorrências em uma visão organizada.' },
  { icon: Scissors, title: 'Gestão de profissionais', text: 'Controle barbeiros, permissões e desempenho individual.' },
  { icon: Store, title: 'Produtos e serviços', text: 'Venda adicionais junto do atendimento e acompanhe o estoque.' },
  { icon: ShieldCheck, title: 'Acessos por perfil', text: 'Administração, recepção e barbeiros com permissões adequadas.' },
  { icon: TrendingUp, title: 'Relatórios práticos', text: 'Indicadores para entender faturamento, agenda e crescimento.' },
];

const differentials = [
  {
    icon: BadgeCheck,
    title: 'Implantação guiada',
    text: 'Estrutura inicial, cadastro e primeiros ajustes com foco na rotina real da barbearia.',
  },
  {
    icon: Users,
    title: 'Pensado para equipes',
    text: 'Fluxos simples para administrador, recepção e barbeiros trabalharem sem atrito.',
  },
  {
    icon: ClipboardCheck,
    title: 'Operação mais previsível',
    text: 'Menos improviso no balcão e mais controle sobre agenda, clientes e recebimentos.',
  },
];

const basicFeatures = [
  'Cadastro de até 2 barbeiros',
  '1 administrativo e 1 administrador',
  'Agendamento online',
  'Cadastro de clientes',
  'Pagamentos avulsos',
  'Assinaturas recorrentes',
  'Suporte via e-mail',
];

const premiumFeatures = [
  'Tudo do Plano Básico',
  'Barbeiros ilimitados',
  'Classificação de profissionais',
  '2 administradores',
  'Avaliações de clientes',
  'Painel financeiro completo',
  'Relatórios financeiros avançados',
  'Controle de comissões',
  'Notificações',
  'Suporte via e-mail e WhatsApp',
];

const masterFeatures = [
  'Tudo do Plano Premium',
  'Agendamento inteligente no WhatsApp',
  'Respostas rápidas',
  'Controle total da operação',
  'Central única de WhatsApp',
  'Central multiatendimento',
];

const PLAN_DETAILS = {
  basic: {
    label: 'Plano Básico',
    price: 'R$ 29,90',
    description: 'Para começar com agenda online, clientes e assinaturas.',
  },
  premium: {
    label: 'Plano Premium',
    price: 'R$ 39,90',
    description: 'Para crescer com equipe ilimitada, financeiro e relatórios.',
  },
  master: {
    label: 'Plano Master',
    price: 'R$ 89,90',
    description: 'Para barbearias que centralizam atendimento, WhatsApp e operação.',
  },
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    barbershopName: '',
    slug: '',
    cnpj: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = () => {
    if (!hasValidSession()) {
      navigate('/login');
      return;
    }

    navigate(getRedirectPath());
  };

  const scrollToPlans = () => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRegisterBarbershop = async (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    const payload = {
      barbershopName: formData.barbershopName.trim(),
      slug: formData.slug.trim() || undefined,
      cnpj: formData.cnpj.trim() || null,
      phone: formData.phone.trim() || null,
      adminName: formData.adminName.trim(),
      adminEmail: formData.adminEmail.trim().toLowerCase(),
      adminPhone: formData.adminPhone.trim() || null,
      password: formData.password,
      selectedPlan,
    };

    if (!payload.barbershopName || !payload.adminName || !payload.adminEmail || !payload.password) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (payload.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) {
      setFormError('Slug inválido. Use apenas letras minúsculas, números e hífen.');
      return;
    }

    if (formData.password.length < 4) {
      setFormError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Senha e confirmação de senha não conferem.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await registerBarbershopFromLanding(payload);

      setFormSuccess('Barbearia cadastrada com sucesso. Redirecionando para pagamento...');

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      const paymentLink = PAYMENT_LINKS[selectedPlan];
      if (!paymentLink) {
        setFormSuccess('Cadastro criado. Nossa equipe entrará em contato para ativar o Plano Master.');
        return;
      }

      const email = encodeURIComponent(payload.adminEmail || '');
      const url = email ? `${paymentLink}?prefilled_email=${email}` : paymentLink;
      window.location.href = url;
    } catch (error) {
      const apiErrors = error?.response?.data;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setFormError(apiErrors[0]);
      } else if (error?.response?.data?.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError('Não foi possível concluir o cadastro agora. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="header-content">
          <a href="#topo" className="logo" aria-label="Barber One">
            <h1>
              BARBER<span>ONE</span>
            </h1>
            <small>by AD Tech Solutions</small>
          </a>
          <nav className="nav-menu" aria-label="Navegação principal">
            <a href="#sobre">Quem Somos</a>
            <a href="#solucoes">Soluções</a>
            <a href="#planos">Planos</a>
            <button onClick={handleLogin} className="btn-login">
              Acessar Sistema
            </button>
          </nav>
        </div>
      </header>

      <main id="topo">
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-hero-content">
              <div className="lp-kicker">
                <Scissors size={18} />
                Sistema de gestão para barbearias
              </div>
              <h1>Agenda, financeiro e equipe em uma rotina mais simples.</h1>
              <p>
                A BARBERONE organiza agendamentos, assinaturas, comissões e relatórios para
                barbearias que querem vender mais sem perder o controle da operação.
              </p>
              <div className="lp-hero-buttons">
                <button onClick={scrollToPlans} className="btn-primary">
                  Começar agora
                  <ArrowRight size={18} />
                </button>
                <button onClick={handleLogin} className="btn-secondary">
                  Já tenho conta
                </button>
              </div>
              <div className="hero-proof" aria-label="Benefícios principais">
                <span>
                  <CheckCircle2 size={18} />
                  Cadastro rápido
                </span>
                <span>
                  <CheckCircle2 size={18} />
                  Planos acessíveis
                </span>
                <span>
                  <CheckCircle2 size={18} />
                  Suporte na implantação
                </span>
              </div>
            </div>

            <div className="hero-brand-visual" aria-label="Identidade Barber One">
              <div className="hero-brand-orbit">
                <span className="orbit-line orbit-line--one" />
                <span className="orbit-line orbit-line--two" />
                <div className="hero-logo-frame">
                  <img src={barberOneLogo} alt="Barber One" />
                </div>
                <div className="hero-tool hero-tool--calendar">
                  <CalendarCheck size={22} />
                  <span>Agenda online</span>
                </div>
                <div className="hero-tool hero-tool--finance">
                  <Wallet size={22} />
                  <span>Financeiro</span>
                </div>
                <div className="hero-tool hero-tool--team">
                  <Users size={22} />
                  <span>Equipe</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="problems-section">
          <div className="lp-container">
            <div className="section-heading">
              <span>Desafios reais</span>
              <h2>Quando a barbearia cresce, improviso começa a custar caro.</h2>
            </div>
            <div className="problems-grid">
              {painPoints.map(({ icon: Icon, title, text }) => (
                <article className="problem-card" key={title}>
                  <Icon size={28} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="result-box">
              Com uma operação centralizada, a equipe enxerga a agenda, atende melhor e acompanha o
              dinheiro sem depender de planilhas soltas.
            </div>
          </div>
        </section>

        <section id="solucoes" className="solution-section">
          <div className="lp-container">
            <div className="section-heading">
              <span>Solução</span>
              <h2>Uma plataforma completa para o dia a dia da sua barbearia.</h2>
              <p>
                Recursos essenciais em uma experiência direta, feita para quem precisa operar rápido
                no balcão e acompanhar os números com clareza.
              </p>
            </div>
            <div className="features-grid">
              {features.map(({ icon: Icon, title, text }) => (
                <article className="feature-item" key={title}>
                  <Icon size={28} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="sobre" className="differentials-section">
          <div className="lp-container">
            <div className="section-heading">
              <span>Por que Barber One</span>
              <h2>Mais organização sem complicar a rotina da equipe.</h2>
            </div>
            <div className="diff-grid">
              {differentials.map(({ icon: Icon, title, text }) => (
                <article className="diff-card" key={title}>
                  <Icon size={30} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="pricing-section">
          <div className="lp-container">
            <div className="section-heading">
              <span>Planos</span>
              <h2>Escolha o plano ideal para começar.</h2>
              <p>Todos incluem agendamento online, cadastro de clientes e recorrência.</p>
            </div>
            <div className="pricing-grid">
              <article className="pricing-card basic">
                <div className="card-header">
                  <h3>Plano Básico</h3>
                  <span className="subtitle">Ideal para barbearias iniciantes</span>
                </div>
                <div className="price">
                  <span className="currency">R$</span>
                  <span className="amount">29,90</span>
                  <span className="period">/mês</span>
                </div>
                <ul className="features-list">
                  {basicFeatures.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={18} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe('basic')} className="btn-plan basic-btn">
                  Assinar Plano Básico
                </button>
              </article>

              <article className="pricing-card premium">
                <div className="recommended-badge">
                  <Star size={15} />
                  Mais popular
                </div>
                <div className="card-header">
                  <h3>Plano Premium</h3>
                  <span className="subtitle">Para barbearias que querem crescer</span>
                </div>
                <div className="price">
                  <span className="currency">R$</span>
                  <span className="amount">39,90</span>
                  <span className="period">/mês</span>
                </div>
                <ul className="features-list">
                  {premiumFeatures.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={18} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe('premium')} className="btn-plan premium-btn">
                  Assinar Plano Premium
                </button>
              </article>

              <article className="pricing-card master">
                <div className="recommended-badge master-badge">
                  <Star size={15} />
                  Mais completo
                </div>
                <div className="card-header">
                  <h3>Plano Master</h3>
                  <span className="subtitle">Para atendimento centralizado no WhatsApp</span>
                </div>
                <div className="price">
                  <span className="currency">R$</span>
                  <span className="amount">89,90</span>
                  <span className="period">/mês</span>
                </div>
                <ul className="features-list">
                  {masterFeatures.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={18} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe('master')} className="btn-plan master-btn">
                  Assinar Plano Master
                </button>
              </article>
            </div>
          </div>
        </section>

        <section className="process-section">
          <div className="lp-container">
            <div className="section-heading">
              <span>Implantação</span>
              <h2>Do cadastro ao primeiro agendamento com menos atrito.</h2>
            </div>
            <div className="process-steps">
              <article className="step">
                <div className="step-number">1</div>
                <h3>Diagnóstico</h3>
                <p>Entendemos estrutura, equipe, serviços e rotina atual.</p>
              </article>
              <article className="step">
                <div className="step-number">2</div>
                <h3>Configuração</h3>
                <p>Organizamos agenda, profissionais, permissões e planos.</p>
              </article>
              <article className="step">
                <div className="step-number">3</div>
                <h3>Operação</h3>
                <p>A equipe começa a atender com mais controle e previsibilidade.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="lp-container cta-content">
            <span>Pronto para organizar sua barbearia?</span>
            <h2>Comece pelo plano ideal e avance para o pagamento com cadastro guiado.</h2>
            <button onClick={scrollToPlans} className="btn-cta">
              Ver planos
              <ArrowRight size={19} />
            </button>
            <div className="social-links">
              <a href="https://instagram.com/adtechsolutions_ltda" target="_blank" rel="noopener noreferrer">
                @adtechsolutions_ltda
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="lp-container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>
                BARBER<span>ONE</span>
              </h3>
              <p>Gestão completa, corte perfeito.</p>
            </div>
            <div className="footer-links">
              <a href="https://www.barberoneapp.com" target="_blank" rel="noopener noreferrer">
                www.barberoneapp.com
              </a>
              <Link to="/privacy">Política de Privacidade</Link>
              <Link to="/terms">Termos de Serviço</Link>
            </div>
          </div>
          <div className="copyright">© 2026 AD Tech Solution Ltda. Todos os direitos reservados.</div>
        </div>
      </footer>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content--register" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={closeModal}
              disabled={submitting}
              aria-label="Fechar cadastro"
            >
              <X size={20} />
            </button>

            <div className="lp-register-header">
              <span>Cadastro rápido</span>
              <h3>Cadastro da Barbearia</h3>
              <p>
                Você selecionou o <strong>{PLAN_LABELS[selectedPlan] || 'plano'}</strong>. Complete
                os dados para criar sua conta e seguir para assinatura.
              </p>
            </div>

            <div className="lp-selected-plan">
              <div>
                <span>Plano selecionado</span>
                <strong>{PLAN_DETAILS[selectedPlan]?.label || PLAN_LABELS[selectedPlan] || 'Plano'}</strong>
                <p>{PLAN_DETAILS[selectedPlan]?.description}</p>
              </div>
              <div className="lp-selected-plan-price">
                {PLAN_DETAILS[selectedPlan]?.price}
                {PLAN_DETAILS[selectedPlan]?.price?.startsWith('R$') ? <small>/mês</small> : null}
              </div>
            </div>

            <form onSubmit={handleRegisterBarbershop} className="lp-register-form">
              <div className="lp-register-section">
                <h4>Dados da Barbearia</h4>

                <label>
                  Nome da barbearia *
                  <input
                    type="text"
                    value={formData.barbershopName}
                    onChange={(e) => handleFormChange('barbershopName', e.target.value)}
                    placeholder="Ex: Barbearia Rodrigues"
                    required
                    disabled={submitting}
                  />
                </label>

                <label>
                  Slug da barbearia
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleFormChange('slug', e.target.value.toLowerCase())}
                    placeholder="Ex: barbearia-rodrigues"
                    disabled={submitting}
                  />
                  <small className="lp-register-helper">
                    Se não informar, o sistema gera automaticamente com base no nome.
                  </small>
                </label>

                <div className="lp-register-grid">
                  <label>
                    CNPJ
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => handleFormChange('cnpj', e.target.value)}
                      placeholder="00.000.000/0001-00"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Telefone da barbearia
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      disabled={submitting}
                    />
                  </label>
                </div>
              </div>

              <div className="lp-register-section">
                <h4>Conta do Administrador</h4>

                <label>
                  Nome do administrador *
                  <input
                    type="text"
                    value={formData.adminName}
                    onChange={(e) => handleFormChange('adminName', e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    disabled={submitting}
                  />
                </label>

                <div className="lp-register-grid">
                  <label>
                    E-mail *
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => handleFormChange('adminEmail', e.target.value)}
                      placeholder="voce@empresa.com"
                      required
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Telefone do administrador
                    <input
                      type="tel"
                      value={formData.adminPhone}
                      onChange={(e) => handleFormChange('adminPhone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      disabled={submitting}
                    />
                  </label>
                </div>

                <div className="lp-register-grid">
                  <label>
                    Senha *
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      required
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    Confirmar senha *
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                      placeholder="Repita sua senha"
                      required
                      disabled={submitting}
                    />
                  </label>
                </div>
              </div>

              {formError ? <p className="lp-register-feedback lp-register-feedback--error">{formError}</p> : null}
              {formSuccess ? <p className="lp-register-feedback lp-register-feedback--success">{formSuccess}</p> : null}

              <div className="modal-buttons">
                <button type="button" onClick={closeModal} className="btn-secondary" disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Cadastrando...' : 'Cadastrar e Continuar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
