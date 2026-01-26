import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from './Button.jsx';
import PaymentModal from './PaymentModal.jsx';
import './SubscriptionSection.css';

export default function SubscriptionSection({ activeSubscription }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    }
  }, []);

  if (activeSubscription) {
    return null;
  }

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

    const planWithRecurring = {
      ...plan,
      isRecurring: true,
      autoRenewal: true
    };
    setSelectedPlan(planWithRecurring);
    setIsModalOpen(true);
  };

  const handlePaymentSuccess = (subscription) => {
    alert(`Assinatura realizada com sucesso! Bem-vindo ao plano ${selectedPlan.name}`);
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  return (
    <>
      <section className="subscription-section">
        <div className="subscription-section__container">
          <div className="subscription-section__header">
            <h2 className="subscription-section__title">Planos de Assinatura</h2>
            <p className="subscription-section__subtitle">
              Escolha o plano perfeito para você e economize todos os meses
            </p>
          </div>

          <div className="subscription-section__plans">
            {plans.map((plan) => {
              const cutsPerMonth = plan.id === 'basic' ? 2 : plan.id === 'premium' ? 4 : 8;
              const { savings, savingsPercent } = calculateSavings(plan.price, cutsPerMonth);

              return (
                <div
                  key={plan.id}
                  className={`subscription-plan ${
                    plan.recommended ? 'subscription-plan--recommended' : ''
                  }`}
                >
                  {plan.recommended && (
                    <div className="subscription-plan__badge">Recomendado</div>
                  )}

                  <div className="subscription-plan__header">
                    <h3 className="subscription-plan__name">{plan.name}</h3>
                    <p className="subscription-plan__subtitle">{plan.subtitle}</p>
                  </div>

                  <div className="subscription-plan__price">
                    <span className="subscription-plan__currency">R$</span>
                    <span className="subscription-plan__amount">
                      {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="subscription-plan__period">/mês</span>
                  </div>

                  {savings > 0 && (
                    <p className="subscription-plan__savings">
                      Economize {savingsPercent}% • R$ {savings.toFixed(2)} por mês
                    </p>
                  )}

                  <ul className="subscription-plan__features">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="subscription-plan__feature">
                        <Check className="subscription-plan__feature-icon" size={20} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    style={{ backgroundColor: plan.color }}
                    className="subscription-plan__button"
                  >
                    Assinar Agora
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="subscription-section__footer">
            <p className="subscription-section__note">
              ✓ Todos os planos são renovados automaticamente a cada mês
            </p>
            <p className="subscription-section__note">
              Cancele quando quiser • Sem taxas de cancelamento
            </p>
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
          isAppointmentPayment={false}
        />
      )}
    </>
  );
}
