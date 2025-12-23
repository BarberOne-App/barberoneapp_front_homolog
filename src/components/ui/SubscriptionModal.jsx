import { X, Check } from 'lucide-react';
import Button from './Button.jsx';
import './SubscriptionModal.css';

export default function SubscriptionModal({ isOpen, onClose, onSelectPlan }) {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="subscription-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="subscription-modal__header">
          <h2>Escolha seu Plano</h2>
          <p>Economize e mantenha seu visual sempre impecável</p>
        </div>

        <div className="plans-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? 'plan-card--popular' : ''}`}
              style={{ '--plan-color': plan.color }}
            >
              {plan.popular && <div className="plan-badge">Mais Popular</div>}

              <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-value">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="price-period">{plan.priceMonth}</span>
                </div>
              </div>

              <ul className="plan-benefits">
                {plan.benefits.map((benefit, index) => (
                  <li key={index}>
                    <Check size={18} className="check-icon" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={plan.popular ? 'button--highlight' : ''}
                style={{ width: '100%' }}
                onClick={() => onSelectPlan(plan)}
              >
                Assinar {plan.name}
              </Button>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <p>Cancele quando quiser • Sem taxas de cancelamento</p>
        </div>
      </div>
    </div>
  );
}
