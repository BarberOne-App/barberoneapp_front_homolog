import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import BaseLayout from '../components/layout/BaseLayout.jsx';
import Button from '../components/ui/Button.jsx';
import SubscriptionModal from '../components/ui/SubscriptionModal.jsx';
import SubscriptionSection from '../components/ui/SubscriptionSection.jsx';
import PaymentModal from '../components/ui/PaymentModal.jsx';
import ProductsSection from '../components/ui/ProductsSection.jsx';

import { getServices, getGallery } from '../services/homeServices.js';
import { buscarPlanosAssinatura, buscarAssinaturaAtiva } from '../services/paymentService.js';
import { getProducts } from '../services/productService.js';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let user = null;
    const possibleKeys = ['user', 'currentUser', 'loggedUser', 'userData'];

    for (const key of possibleKeys) {
      const userData = localStorage.getItem(key);

      if (userData) {
        try {
          user = JSON.parse(userData);
          setCurrentUser(user);
          break;
        } catch (error) {
          console.error(`Erro ao parsear chave "${key}":`, error);
        }
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    if (currentUser) {
      verificarAssinaturaAtiva();
    }
  }, [currentUser]);

  async function carregarDados() {
    try {
      const [servicesData, galleryData, plansData, productsData] = await Promise.all([
        getServices(),
        getGallery(),
        buscarPlanosAssinatura(),
        getProducts(),
      ]);

      setServices(servicesData);
      setGallery(galleryData);
      setSubscriptionPlans(plansData);
      setProducts(productsData);
    } catch (error) {
      console.error('Erro ao carregar dados da Home:', error);
    } finally {
      setLoading(false);
    }
  }

  async function verificarAssinaturaAtiva() {
    try {
      const assinatura = await buscarAssinaturaAtiva(currentUser.id);
      setActiveSubscription(assinatura);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    }
  }

  const abrirModalAssinatura = () => {
    if (!currentUser) {
      const possibleKeys = ['user', 'currentUser', 'loggedUser', 'userData'];
      let foundUser = null;

      for (const key of possibleKeys) {
        const userData = localStorage.getItem(key);
        if (userData) {
          try {
            foundUser = JSON.parse(userData);
            setCurrentUser(foundUser);
            break;
          } catch (error) {
            console.error('Erro ao parsear:', error);
          }
        }
      }

      if (!foundUser) {
        alert('Faça login para assinar um plano');
        navigate('/login');
        return;
      }
    }

    if (activeSubscription) {
      alert('Você já possui uma assinatura ativa!');
      navigate('/minha-assinatura');
      return;
    }

    setShowSubscriptionModal(true);
  };

  const selecionarPlano = (plano) => {
    setSelectedPlan(plano);
    setShowSubscriptionModal(false);
    setShowPaymentModal(true);
  };

  const sucessoPagamento = (assinatura) => {
    setActiveSubscription(assinatura);
    alert('Parabéns! Sua assinatura foi ativada com sucesso!');
    navigate('/minha-assinatura');
  };

  const fecharModalPagamento = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <BaseLayout>
        <div className="home__loading">
          <p>Carregando informações...</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <div className="home">
        <section className="hero" id="inicio">
          <div className="hero__background">
            <img
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070"
              alt="Barbearia ADDEV"
              className="hero__background-image"
            />
            <div className="hero__overlay"></div>
          </div>

          <div className="hero__content">
            <h1 className="hero__title">Estilo e Tradição em um só lugar</h1>
            <p className="hero__subtitle">
              Há mais de 10 anos cuidando do seu visual com excelência e profissionalismo
            </p>

            <div className="hero__buttons">
              <Link to="/agendamentos">
                <Button>Agendar Horário</Button>
              </Link>

              {activeSubscription && (
                <span className="subscription-badge">
                  Plano {activeSubscription.planName} Ativo
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="services" id="servicos">
          <div className="container">
            <h2 className="section__title">Nossos Serviços</h2>
            <p className="section__subtitle">
              Oferecemos uma variedade de serviços para você ficar impecável
            </p>

            <div className="services__grid">
              {services.map((service) => (
                <div key={service.id} className="service-card">
                  <div className="service-card__image">
                    <img src={service.image} alt={service.name} />
                  </div>
                  <h3 className="service-card__name">{service.name}</h3>
                  <p className="service-card__price">{service.price}</p>

                  {/* {activeSubscription && (
                    <span className="discount-badge">
                      {activeSubscription.planId === 'basic' ? '10%' : 
                       activeSubscription.planId === 'premium' ? '20%' : '30%'} OFF
                    </span>
                  )} */}
                </div>
              ))}
            </div>
          </div>
        </section>

        <ProductsSection products={products} activeSubscription={activeSubscription} />

        <section className="subscription-banner">
          <div className="subscription-banner__background">
            <img
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070"
              alt="Assine nossos serviços"
              className="subscription-banner__background-image"
            />
            <div className="subscription-banner__overlay"></div>
          </div>

          <div className="subscription-banner__content">
            <h2 className="subscription-banner__title">
              {activeSubscription ? 'Seu Plano Ativo' : 'Planos de Assinatura'}
            </h2>
            <p className="subscription-banner__subtitle">
              {activeSubscription
                ? `Você está no plano ${activeSubscription.planName}!`
                : 'Economize com nossos planos mensais e tenha sempre seu visual em dia'}
            </p>
            <div className="subscription-banner__buttons">
              <Button onClick={abrirModalAssinatura}>
                {activeSubscription ? 'Gerenciar Plano' : 'Conhecer Planos'}
              </Button>
            </div>
          </div>
        </section>

        <section className="gallery" id="fotos">
          <div className="container">
            <h2 className="section__title">Galeria</h2>
            <p className="section__subtitle">Alguns dos nossos trabalhos recentes</p>

            <div className="gallery__grid">
              {gallery.map((item) => (
                <div key={item.id} className="gallery__item">
                  <img src={item.url} alt={item.alt} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <SubscriptionSection
          plans={subscriptionPlans}
          onSelectPlan={selecionarPlano}
          activeSubscription={activeSubscription}
        />

        <section className="about" id="sobre">
          <div className="container">
            <h2 className="section__title">Sobre Nós</h2>

            <div className="about__content">
              <div className="about__text">
                <p>
                  A <strong>Barbearia Rodrigues</strong> é referência em cortes masculinos há mais de 10
                  anos.
                </p>
                <p>
                  Combinamos técnicas tradicionais com tendências modernas para garantir o melhor
                  atendimento.
                </p>
                <p>Nosso ambiente proporciona conforto e uma experiência única.</p>
              </div>

              <div className="about__info">
                <div className="info-card">
                  <h3>Horário de Funcionamento</h3>
                  <p>Seg - 14h as 20h;</p>
                  <p>Terça a Sab. - 09h as 20h</p>
                  <p>Domingo: Fechado</p>
                </div>

                <div className="info-card">
                  <h3>Localização</h3>
                  <p>Av. val paraíso,1396</p>
                  <p>Jangurussu - Fortaleza/CE</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contato">
          <div className="container">
            <h2 className="contato__title">Pronto para renovar seu visual?</h2>
            <p className="contato__text">Agende seu horário agora e garanta o melhor atendimento</p>

            <Link to="/agendamentos">
              <Button>Agendar Agora</Button>
            </Link>
          </div>
        </section>
      </div>

      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          plans={subscriptionPlans}
          onSelectPlan={selecionarPlano}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={fecharModalPagamento}
          selectedPlan={selectedPlan}
          currentUser={currentUser}
          onSuccess={sucessoPagamento}
        />
      )}
    </BaseLayout>
  );
}
