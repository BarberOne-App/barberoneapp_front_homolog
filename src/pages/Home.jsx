import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout.jsx';
import Button from '../components/ui/Button.jsx';
import SubscriptionSection from '../components/ui/SubscriptionSection.jsx';
import ManageSubscriptionModal from '../components/ui/ManageSubscriptionModal.jsx';
import ProductsSection from '../components/ui/ProductsSection.jsx';
import { FaWhatsapp } from 'react-icons/fa';
import { getServices, getGallery } from '../services/homeServices.js';
import { buscarAssinaturaAtiva } from '../services/paymentService.js';
import { getProducts } from '../services/productService.js';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);
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
          console.error(`Erro ao parsear chave ${key}:`, error);
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
      const [servicesData, galleryData, productsData] = await Promise.all([
        getServices(),
        getGallery(),
        getProducts()
      ]);
      
      setServices(servicesData);
      setGallery(galleryData);
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

  const handleBuyProduct = (product) => {
    alert(`Produto ${product.name} disponível na barbearia!`);
  };

  const abrirModalGerenciar = () => {
    if (!currentUser) {
      alert('Faça login para gerenciar sua assinatura');
      navigate('/login');
      return;
    }
    
    if (activeSubscription) {
      setShowManageModal(true);
    }
  };

  const scrollToPlans = () => {
    const subscriptionSection = document.querySelector('.subscription-section');
    if (subscriptionSection) {
      subscriptionSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Nova função para navegar com serviço pré-selecionado
  const handleServiceClick = (service) => {
    navigate('/agendamentos', { 
      state: { preSelectedService: service } 
    });
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
        {/* Hero Section */}
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
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="services" id="servicos">
          <div className="container">
            <h2 className="section__title">Nossos Serviços</h2>
            <p className="section__subtitle">
              Oferecemos uma variedade de serviços para você ficar impecável
            </p>

            {!activeSubscription && (
              <div className="services__subscription-cta">
                <h3 className="subscription-cta__title">Quer economizar ainda mais?</h3>
                <p className="subscription-cta__text">Assine um de nossos planos e ganhe descontos exclusivos!</p>
                <button className="subscription-cta__button" onClick={scrollToPlans}>
                  Ver Planos
                </button>
              </div>
            )}

            <div className="services__grid">
              {services.map(service => (
                <div 
                  key={service.id} 
                  className="service-card"
                  onClick={() => handleServiceClick(service)}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div className="service-card__image">
                    <img src={service.image} alt={service.name} />
                  </div>
                  <h3 className="service-card__name">{service.name}</h3>
                  <p className={`service-card__price ${activeSubscription ? 'service-card__price--covered' : ''}`}>
                    {activeSubscription ? 'Coberto pela assinatura' : service.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products Section */}
        <ProductsSection 
          products={products}
          activeSubscription={activeSubscription}
          onBuyProduct={handleBuyProduct}
        />

        {/* Subscription Banner */}
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
          </div>
        </section>

        {/* Subscription Section */}
        <SubscriptionSection activeSubscription={activeSubscription} />

        {/* Gallery Section */}
        <section className="gallery" id="fotos">
          <div className="container">
            <h2 className="section__title">Galeria</h2>
            <p className="section__subtitle">Alguns dos nossos trabalhos recentes</p>
            <div className="gallery__grid">
              {gallery.map(item => (
                <div key={item.id} className="gallery__item">
                  <img src={item.url} alt={item.alt} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="about" id="sobre">
          <div className="container">
            <h2 className="section__title">Sobre Nós</h2>
            <div className="about__content">
              <div className="about__text">
                <p>
                  A <strong>Barbearia Rodrigues</strong> é referência em cortes masculinos há mais de 10 anos.
                </p>
                <p>
                  Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.
                </p>
                <p>Nosso ambiente proporciona conforto e uma experiência única.</p>
                <a 
                  href="https://wa.me/5585999999999" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="header__contato"
                >
                  <FaWhatsapp /> Fale conosco
                </a>
              </div>
              
              <div className="about__info">
                <div className="info-card">
                  <h3>Horário de Funcionamento</h3>
                  <p>Seg - 14h as 20h</p>
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

        {/* Contact Section */}
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

      {showManageModal && activeSubscription && (
        <ManageSubscriptionModal 
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          subscription={activeSubscription}
        />
      )}
    </BaseLayout>
  );
}
