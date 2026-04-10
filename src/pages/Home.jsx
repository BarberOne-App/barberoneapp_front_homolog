import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout.jsx';
import Button from '../components/ui/Button.jsx';
import SubscriptionSection from '../components/ui/SubscriptionSection.jsx';
import ManageSubscriptionModal from '../components/ui/ManageSubscriptionModal.jsx';
import ProductsSection from '../components/ui/ProductsSection.jsx';
import Toast from '../components/ui/Toast.jsx';
import { FaWhatsapp } from 'react-icons/fa';
import { getServices, getGallery } from '../services/homeServices.js';
import { buscarAssinaturaAtiva, criarVendaProduto } from '../services/paymentService.js';
import ProductsModal from '../components/ui/ProductsModal.jsx';
import PaymentChoiceModal from '../components/ui/PaymentChoiceModal.jsx';
import PaymentModal from '../components/ui/PaymentModal.jsx';
import { getProducts } from '../services/productService.js';
import { getHomeInfo } from '../services/settingsService.js';
import { getActiveBarbershop } from '../components/layout/Barbershops.jsx';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const HOME_INFO_LOCAL_KEY = 'barberone_home_info_local';
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [activeBarbershop] = useState(getActiveBarbershop);
  const [showProductBuyModal, setShowProductBuyModal] = useState(false);
  const [showProductPaymentModal, setShowProductPaymentModal] = useState(false);
  const [selectedProductForBuy, setSelectedProductForBuy] = useState(null);
  const [pendingProductSale, setPendingProductSale] = useState(null);
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);

  const [siteInfo, setSiteInfo] = useState({
    heroTitle: "",
    heroSubtitle: "",
    heroImage: "",
    heroImages: [],
    aboutTitle: "Barbearia Rodrigues",
    aboutText1: "",
    aboutText2: "",
    aboutText3: "",
    scheduleTitle: "Horário de Funcionamento",
    scheduleLine1: "",
    scheduleLine2: "",
    scheduleLine3: "",
    whatsappNumber: "",
    locationTitle: "Localização",
    locationAddress: "",
    locationCity: ""
  });

  const whatsappNumber = String(siteInfo.whatsappNumber || '').replace(/\D/g, '');
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : 'https://wa.me/5585999999999';
  const handleHeroButtonClick = (target) => {
  if (target.startsWith('#')) {
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  } else {
    navigate(target);
  }
};

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const normalizedHeroImages = Array.isArray(siteInfo.heroImages)
    ? siteInfo.heroImages.filter((image) => String(image || '').trim() !== '')
    : [];

  const effectiveHeroImages = normalizedHeroImages.length
    ? normalizedHeroImages
    : siteInfo.heroImage
      ? [siteInfo.heroImage]
      : [];

  const currentHeroImage = effectiveHeroImages[currentImageIndex] || '';

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


    const urlParams = new URLSearchParams(window.location.search);
    const mpStatus = urlParams.get('status');
    if (mpStatus === 'failure') {
      sessionStorage.removeItem('mp_pending_plan');
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => showToast('Pagamento recusado. Tente novamente.', 'danger'), 500);
    }

  }, []);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === HOME_INFO_LOCAL_KEY) {
        carregarDados();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (currentUser) {
      verificarAssinaturaAtiva();
    }
  }, [currentUser]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  async function carregarDados() {
    try {
      const [servicesData, galleryData, productsData, homeInfoData] = await Promise.all([
        getServices(),
        getGallery(),
        getProducts(),
        getHomeInfo(),
      ]);

      setServices(servicesData);
      setGallery(galleryData);
      setProducts(productsData);

      /* if (homeInfoData) {
        setSiteInfo(homeInfoData);
      } */
     
      if (homeInfoData) {
        const homeData = Array.isArray(homeInfoData) ? homeInfoData[0] : homeInfoData;
        setSiteInfo((prev) => ({
          ...prev,
          ...homeData,
          heroImages: Array.isArray(homeData?.heroImages) ? homeData.heroImages : [],
        }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados da Home:', error);
    } finally {
      setLoading(false);
    }
  }

   async function verificarAssinaturaAtiva() {
    try {
      const assinatura = await buscarAssinaturaAtiva(currentUser);
      setActiveSubscription(assinatura);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    }
  } 

  const handleUpdateStock = async (productId, quantity) => {
    try {
      const response = await fetch(`https://barberone-backend.onrender.com/products/${productId}`);
      const product = await response.json();
      const newStock = Math.max(0, product.stock - quantity);
      await fetch(`https://barberone-backend.onrender.com/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      );
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
    }
  };

  const handleBuyProduct = (product) => {
    if (!currentUser) {
      showToast('Faça login para comprar produtos', 'danger');
      navigate('/login');
      return;
    }
    setSelectedProductForBuy(product);
    setShowProductBuyModal(true);
  };

  const handleProductModalConfirm = (purchaseData) => {
    if (!purchaseData.products || purchaseData.products.length === 0) {
      setShowProductBuyModal(false);
      return;
    }
    setPendingProductSale(purchaseData);
    setShowProductBuyModal(false);
    setShowProductPaymentModal(true);
  };

  const handleProductPaymentChoice = async (payNow) => {
    if (!pendingProductSale) return;

    if (payNow) {

      setShowProductPaymentModal(false);
      setShowOnlinePaymentModal(true);
      return;
    }

    try {
      await criarVendaProduto({
        userId: currentUser.id,
        userName: currentUser.name,
        products: pendingProductSale.products,
        productsTotal: pendingProductSale.productsTotal,
        status: 'pendinglocal',
        paymentMethod: 'local',
      });
      showToast('Pedido registrado! Pague na barbearia.', 'success');
    } catch (err) {
      showToast('Erro ao registrar pedido.', 'danger');
    } finally {
      setPendingProductSale(null);
      setShowProductPaymentModal(false);
    }
  };

  const handleOnlinePaymentSuccess = async () => {
    if (!pendingProductSale) return;
    try {
      await criarVendaProduto({
        userId: currentUser.id,
        userName: currentUser.name,
        products: pendingProductSale.products,
        productsTotal: pendingProductSale.productsTotal,
        status: 'paid',
        paymentMethod: 'online',
      });
      showToast('Pagamento confirmado! Pedido registrado.', 'success');
    } catch (err) {
      showToast('Erro ao registrar pedido.', 'danger');
    } finally {
      setPendingProductSale(null);
      setShowOnlinePaymentModal(false);
    }
  };

  const abrirModalGerenciar = () => {
    if (!currentUser) {
      showToast('Faça login para gerenciar sua assinatura', 'danger');
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

  const handleServiceClick = (service) => {
    navigate('/agendamentos', { state: { preSelectedService: service } });
  };

  useEffect(() => {
    if (effectiveHeroImages.length <= 1) {
      setCurrentImageIndex(0);
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % effectiveHeroImages.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [effectiveHeroImages.length]);

  useEffect(() => {
    if (currentImageIndex >= effectiveHeroImages.length) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, effectiveHeroImages.length]);

  const parseCurrencyValue = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    let raw = String(value ?? '').replace(/R\$/gi, '').trim();
    if (!raw) return 0;

    raw = raw.replace(/\s/g, '');
    if (raw.includes(',')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getServiceBasePriceValue = (service) => {
    return parseCurrencyValue(service?.basePrice ?? service?.price);
  };

  const getServicePromotionalPriceValue = (service) => {
    return parseCurrencyValue(service?.promotionalPrice);
  };

  const isServiceCoveredByPlan = (service) => {
    return Boolean(service?.coveredByPlan ?? service?.covered_by_plan);
  };

  const hasValidPromotionalPrice = (service) => {
    const promotionalPrice = getServicePromotionalPriceValue(service);
    const basePrice = getServiceBasePriceValue(service);

    if (promotionalPrice <= 0) return false;
    if (basePrice <= 0) return true;

    return promotionalPrice < basePrice;
  };

  const getServiceDisplayPrice = (service) => {
    const basePrice = getServiceBasePriceValue(service);
    return basePrice > 0 ? formatCurrency(basePrice) : 'Consulte valor';
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
    {currentHeroImage ? (
      <img
        src={currentHeroImage}
        alt="Banner da Barbearia"
        className="hero__background-image"
      />
    ) : (
      <div className="hero__background-placeholder" style={{ background: '#111' }} />
    )}

    {effectiveHeroImages.length > 1 && (
      <div className="hero__indicators" aria-label="Indicadores do carrossel">
        {effectiveHeroImages.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`hero__indicator ${index === currentImageIndex ? 'hero__indicator--active' : ''}`}
            onClick={() => setCurrentImageIndex(index)}
            aria-label={`Ir para banner ${index + 1}`}
          />
        ))}
      </div>
    )}

    <div className="hero__overlay"></div>
  </div>

  <div className="hero__content">
    <h1 className="hero__title">{siteInfo.heroTitle || "Estilo e Tradição"}</h1>
    <p className="hero__subtitle">{siteInfo.heroSubtitle || "Cuidando do seu visual"}</p>

    <div className="hero__buttons">
      <Button onClick={() => navigate("/agendamentos")}>Agendar Agora</Button>
      <Button variant="outline" onClick={() => {
        const element = document.querySelector("#servicos");
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }}>Conheça os Serviços</Button>
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
              {services.items.map((service) => (
                <div
                  key={service.id}
                  className="service-card"
                  onClick={() => handleServiceClick(service)}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div className="service-card__image">
                    <img src={service.imageUrl} alt={service.name} />
                  </div>
                  <h3 className="service-card__name">{service.name}</h3>
                  <p
                    className={`service-card__price ${activeSubscription && isServiceCoveredByPlan(service)
                        ? 'service-card__price--covered'
                        : ''
                      }`}
                  >

                    {activeSubscription && isServiceCoveredByPlan(service) ? (
                      'Coberto pela assinatura'
                    ) : activeSubscription && hasValidPromotionalPrice(service) ? (
                      <span
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            textDecoration: 'line-through',
                            opacity: 0.6,
                            fontSize: '0.85em',
                            color: '#999',
                          }}
                        >
                          {getServiceDisplayPrice(service)}
                        </span>
                        <span
                          style={{
                            color: '#22c55e',
                            fontWeight: 'bold',
                            fontSize: '1.1em',
                          }}
                        >
                          {formatCurrency(getServicePromotionalPriceValue(service))}
                        </span>
                      </span>
                    ) : (
                      getServiceDisplayPrice(service)
                    )}
                  </p>
                </div>
              ))}
            </div>

            {!activeSubscription && (
              <div className="services__subscription-cta">
                <h3 className="subscription-cta__title">Quer economizar?</h3>
                <p className="subscription-cta__text">
                  Assine um de nossos planos e ganhe descontos exclusivos!
                </p>
                <button className="subscription-cta__button" onClick={scrollToPlans}>
                  Ver Planos
                </button>
              </div>
            )}
          </div>
        </section>

        <ProductsSection
          products={products}
          activeSubscription={activeSubscription}
          onBuyProduct={handleBuyProduct}
        />

        <SubscriptionSection
          activeSubscription={activeSubscription}
          onSubscribe={abrirModalGerenciar}
        />

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

        <section className="about" id="sobre">
          <div className="container">

            <h2 className="section__title">Sobre Nós</h2>
            <div className="about__content">
              <div className="about__text">
                <p>
                  A <strong>{siteInfo.aboutTitle || 'Barbearia Rodrigues'}</strong>{' '}
                  {siteInfo.aboutText1 || 'é referência em cortes masculinos há mais de 10 anos.'}
                </p>
                <p>
                  {siteInfo.aboutText2 || 'Combinamos técnicas tradicionais com tendências modernas para garantir o melhor atendimento.'}
                </p>
                <p>{siteInfo.aboutText3 || 'Nosso ambiente proporciona conforto e uma experiência única.'}</p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="header__contato"
                >
                  <FaWhatsapp /> Fale conosco
                </a>
              </div>

              <div className="about__info">
                <div className="info-card">

                  <h3>{siteInfo.scheduleTitle || 'Horário de Funcionamento'}</h3>
                  <p>{siteInfo.scheduleLine1 || 'Seg - 14h as 20h'}</p>
                  <p>{siteInfo.scheduleLine2 || 'Terça a Sab. - 09h as 20h'}</p>
                  <p>{siteInfo.scheduleLine3 || 'Domingo: Fechado'}</p>
                </div>

                <div className="info-card">

                  <h3>{siteInfo.locationTitle || 'Localização'}</h3>
                  <p>{siteInfo.locationAddress || 'Av. val paraíso,1396'}</p>
                  <p>{siteInfo.locationCity || 'Jangurussu - Fortaleza/CE'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <section className="contato">
          <div className="container">
            <h2 className="contato__title">Pronto para renovar seu visual?</h2>
            <p className="contato__text">
              Agende seu horário agora e garanta o melhor atendimento
            </p>
            <Link to="/agendamentos">
              <Button>Agendar Agora</Button>
            </Link>
          </div>
        </section> */}

        <footer className="home__footer">
          <div className="container">
            <div className="home__footer-content">
             <div className="home__footer-logo" onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
  <h3>BARBER<span>ONE</span></h3>
  <p>Gestão completa, corte perfeito.</p>
</div>
              <div className="home__footer-links">
                <a href="https://www.barberoneapp.com" target="_blank" rel="noopener noreferrer">
                  www.barberoneapp.com
                </a>
              </div>
            </div>
            <div className="home__footer-copyright">
              © 2026 AD Tech Solution Ltda. Todos os direitos reservados.
            </div>
          </div>
        </footer>
      </div>

      {showManageModal && activeSubscription && (
        <ManageSubscriptionModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          subscription={activeSubscription}
          user={currentUser}
        />
      )}

      {showProductBuyModal && (
        <ProductsModal
          isOpen={showProductBuyModal}
          onClose={() => setShowProductBuyModal(false)}
          products={selectedProductForBuy ? [selectedProductForBuy, ...products.filter(p => p.id !== selectedProductForBuy.id)] : products}
          onConfirm={handleProductModalConfirm}
          hasActiveSubscription={!!activeSubscription}
          servicePrice={0}
          serviceName=""
          onUpdateStock={handleUpdateStock}
          preSelectedProducts={selectedProductForBuy ? [selectedProductForBuy] : []}
        />
      )}

      {showProductPaymentModal && pendingProductSale && (
        <PaymentChoiceModal
          isOpen={showProductPaymentModal}
          onClose={() => setShowProductPaymentModal(false)}
          onChoose={handleProductPaymentChoice}
          appointmentDetails={{
            barberName: '—',
            date: new Date().toLocaleDateString('pt-BR'),
            time: '—',
            serviceName: 'Compra de Produto',
          }}
          purchaseData={{
            products: pendingProductSale.products,
            productsTotal: pendingProductSale.productsTotal,
            servicePrice: 0,
            finalTotal: pendingProductSale.productsTotal,
            hasActiveSubscription: !!activeSubscription,
          }}
        />
      )}

      {showOnlinePaymentModal && pendingProductSale && (
        <PaymentModal
          isOpen={showOnlinePaymentModal}
          onClose={() => setShowOnlinePaymentModal(false)}
          selectedPlan={{ price: pendingProductSale.productsTotal, name: 'Compra de Produtos' }}
          currentUser={currentUser}
          isAppointmentPayment={true}
          onSuccess={handleOnlinePaymentSuccess}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </BaseLayout>
  );
}