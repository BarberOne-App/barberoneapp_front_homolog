import { X, Check } from 'lucide-react';
import { useState } from 'react';
import PaymentModal from './PaymentModal.jsx';
import './SubscriptionModal.css';

export default function SubscriptionModal({ isOpen, onClose, currentUser }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'basic',
      name: 'Básico',
      price: 89.90,
      priceMonth: '/mês',
      popular: false,
      color: '#6b7280',
      benefits: [
        '2 cortes por mês',
        '10% de desconto em produtos',
        'Agendamento prioritário',
        'Suporte por WhatsApp',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 149.90,
      priceMonth: '/mês',
      popular: true,
      color: '#ff7a1a',
      benefits: [
        '4 cortes por mês',
        '1 barba grátis por mês',
        '20% de desconto em produtos',
        'Agendamento prioritário',
        'Acesso a eventos exclusivos',
        'Suporte VIP 24/7',
      ],
    },
    {
      id: 'vip',
      name: 'VIP Gold',
      price: 249.90,
      priceMonth: '/mês',
      popular: false,
      color: '#d4af37',
      benefits: [
        'Cortes ilimitados',
        '2 barbas grátis por mês',
        '1 tratamento capilar/mês',
        '30% de desconto em produtos',
        'Agendamento prioritário',
        'Bebidas premium inclusas',
        'Acesso a eventos exclusivos',
        'Suporte VIP 24/7',
        'Presente de aniversário',
      ],
    },
  ];

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
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (subscription) => {
    alert(`Assinatura realizada com sucesso! Bem-vindo ao plano ${selectedPlan.name}`);
    setShowPaymentModal(false);
    setSelectedPlan(null);
    onClose();
  };

  const handleClosePayment = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  return (
    <>
      <div className="subscription-modal-overlay" onClick={onClose}>
        <div className="subscription-modal" onClick={(e) => e.stopPropagation()}>
          <button className="subscription-modal__close" onClick={onClose}>
            <X size={24} />
          </button>

          <div className="subscription-modal__header">
            <h2 className="subscription-modal__title">Planos de Assinatura</h2>
            <p className="subscription-modal__subtitle">
              Escolha o plano perfeito para você e economize todos os meses
            </p>
          </div>

          <div className="subscription-modal__plans">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`subscription-modal__plan ${plan.popular ? 'subscription-modal__plan--popular' : ''}`}
              >
                {plan.popular && (
                  <div className="subscription-modal__badge">MAIS POPULAR</div>
                )}

                <h3 className="subscription-modal__plan-name">{plan.name}</h3>

                <div className="subscription-modal__plan-price">
                  <span className="subscription-modal__currency">R$</span>
                  <span className="subscription-modal__amount">
                    {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="subscription-modal__period">{plan.priceMonth}</span>
                </div>

                <ul className="subscription-modal__benefits">
                  {plan.benefits.map((benefit, index) => (
                    <li key={index} className="subscription-modal__benefit">
                      <Check size={18} />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className="subscription-modal__button"
                  style={{ backgroundColor: plan.color }}
                  onClick={() => handleSelectPlan(plan)}
                >
                  Assinar Agora
                </button>
              </div>
            ))}
          </div>

          <p className="subscription-modal__footer">
            Cobrança recorrente automática • Cancele quando quiser • Sem taxas de cancelamento
          </p>
        </div>
      </div>

      {showPaymentModal && selectedPlan && currentUser && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handleClosePayment}
          selectedPlan={selectedPlan}
          currentUser={currentUser}
          onSuccess={handlePaymentSuccess}
          isAppointmentPayment={false}
        />
      )}
    </>
  );
}
