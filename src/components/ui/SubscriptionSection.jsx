import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from './Button.jsx';
import PaymentModal from './PaymentModal.jsx';
import './SubscriptionSection.css';

export default function SubscriptionSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
  
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (error) {
        console.error('Erro ao parsear usuário:', error);
      }
    }
  }, []);

  const plans = [
    {
      id: 'basic',
      name: 'Básico',
      subtitle: 'Para quem busca economia',
      price: 89.90,
      color: '#6b7280',
      features: [
        '2 cortes por mês',
        '10% off em produtos',
        'Agendamento prioritário',
        'Suporte via WhatsApp'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      subtitle: 'O mais escolhido',
      price: 149.90,
      color: '#ff7a1a',
      recommended: true,
      features: [
        '4 cortes por mês',
        '1 barba grátis/mês',
        '20% off em produtos',
        'Agendamento prioritário',
        'Eventos exclusivos',
        'Suporte VIP 24/7'
      ]
    },
    {
      id: 'vip',
      name: 'VIP Gold',
      subtitle: 'Experiência premium',
      price: 249.90,
      color: '#d4af37',
      features: [
        'Cortes ilimitados',
        '2 barbas grátis/mês',
        '1 tratamento capilar/mês',
        '30% off em produtos',
        'Agendamento prioritário',
        'Bebidas premium',
        'Eventos exclusivos',
        'Suporte VIP 24/7',
        'Presente de aniversário'
      ]
    }
  ];

  const calculateSavings = (price, cutsPerMonth) => {
    const regularPrice = 50; 
    const monthlyCost = regularPrice * cutsPerMonth;
    const savings = monthlyCost - price;
    const savingsPercent = ((savings / monthlyCost) * 100).toFixed(0);
    
    return { savings, savingsPercent };
  };

  const handleSelectPlan = (plan) => {
  
    if (!currentUser) {
      alert('Por favor, faça login para assinar um plano.');
    
      return;
    }

    console.log('Plano selecionado:', plan);
    console.log('Usuário atual:', currentUser);
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handlePaymentSuccess = (subscription) => {
    console.log('Pagamento realizado com sucesso:', subscription);
    alert('Assinatura realizada com sucesso! Bem-vindo ao plano ' + selectedPlan.name);
    setIsModalOpen(false);
    setSelectedPlan(null);
    

  };

  return (
    <>
      <section className="subscription-section" id="planos">
        <div className="container">
          <div className="subscription-section__header">
            <h2 className="subscription-section__title">
              Planos de Assinatura
            </h2>
            <p className="subscription-section__subtitle">
              Escolha o plano perfeito para você e economize todos os meses
            </p>
          </div>

          <div className="subscription-plans">
            {plans.map((plan) => {
              const cutsPerMonth = plan.id === 'basic' ? 2 : plan.id === 'premium' ? 4 : 8;
              const { savings, savingsPercent } = calculateSavings(plan.price, cutsPerMonth);
              
              return (
                <div 
                  key={plan.id}
                  className={`subscription-plan ${plan.recommended ? 'subscription-plan--recommended' : ''}`}
                  style={{ '--plan-color': plan.color }}
                >
                  <div className="plan-content">
                    <div className="plan-top">
                      <h3 className="plan-title">{plan.name}</h3>
                      <p className="plan-subtitle">{plan.subtitle}</p>
                      
                      <div className="plan-pricing">
                        <div className="plan-price-main">
                          <span className="currency">R$</span>
                          <span className="price">{plan.price.toFixed(2).replace('.', ',')}</span>
                          <span className="period">/mês</span>
                        </div>
                        
                        {savings > 0 && (
                          <div className="plan-savings">
                            Economize {savingsPercent}% • R$ {savings.toFixed(2)} por mês
                          </div>
                        )}
                      </div>
                    </div>

                    <ul className="plan-features">
                      {plan.features.map((feature, index) => (
                        <li key={index}>
                          <Check size={20} className="feature-icon" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className={`plan-button ${plan.recommended ? 'plan-button--recommended' : ''}`}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      Assinar Agora
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="subscription-info">
            <div className="info-item">
              <h4>Cancele quando quiser</h4>
              <p>Sem multas ou taxas de cancelamento</p>
            </div>
            <div className="info-item">
              <h4>Primeiro mês grátis</h4>
              <p>Teste por 30 dias sem compromisso</p>
            </div>
            <div className="info-item">
              <h4>Benefícios imediatos</h4>
              <p>Comece a usar assim que assinar</p>
            </div>
          </div>
        </div>
      </section>

      {isModalOpen && selectedPlan && currentUser && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPlan(null);
          }}
          selectedPlan={selectedPlan}
          currentUser={currentUser}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}