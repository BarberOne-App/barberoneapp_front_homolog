import { X, Check, CreditCard, Calendar, AlertCircle, Crown, Sparkles } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import Button from './Button.jsx';
import './ManageSubscriptionModal.css';

export default function ManageSubscriptionModal({ isOpen, onClose, subscription }) {
  if (!isOpen || !subscription) return null;

  const planConfigs = {
    basic: {
      color: '#6b7280',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: Calendar
    },
    basico: {
      color: '#6b7280',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: Calendar
    },
    premium: {
      color: '#ff7a1a',
      gradient: 'linear-gradient(135deg, #ff7a1a 0%, #ff9a4a 100%)',
      icon: Crown
    },
    vip: {
      color: '#d4af37',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)',
      icon: Sparkles
    },
    'vip gold': {
      color: '#d4af37',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)',
      icon: Sparkles
    }
  };

  const planBenefits = {
    basic: [
      '2 cortes por mês',
      '10% de desconto em produtos',
      'Agendamento prioritário',
      'Suporte por WhatsApp'
    ],
    basico: [
      '2 cortes por mês',
      '10% de desconto em produtos',
      'Agendamento prioritário',
      'Suporte por WhatsApp'
    ],
    premium: [
      '4 cortes por mês',
      '1 barba grátis por mês',
      '20% de desconto em produtos',
      'Agendamento prioritário',
      'Acesso a eventos exclusivos',
      'Suporte VIP 24/7'
    ],
    vip: [
      'Cortes ilimitados',
      '2 barbas grátis por mês',
      '1 tratamento capilar/mês',
      '30% de desconto em produtos',
      'Agendamento prioritário',
      'Bebidas premium inclusas',
      'Acesso a eventos exclusivos',
      'Suporte VIP 24/7',
      'Presente de aniversário'
    ],
    'vip gold': [
      'Cortes ilimitados',
      '2 barbas grátis por mês',
      '1 tratamento capilar/mês',
      '30% de desconto em produtos',
      'Agendamento prioritário',
      'Bebidas premium inclusas',
      'Acesso a eventos exclusivos',
      'Suporte VIP 24/7',
      'Presente de aniversário'
    ]
  };

  const planName = subscription.planName || subscription.name || 'Premium';
  const planKey = planName.toLowerCase();
  const config = planConfigs[planKey] || planConfigs.premium;
  const benefits = planBenefits[planKey] || planBenefits.premium;
  const planPrice = subscription.price || subscription.amount || 149.90;
  const PlanIcon = config.icon;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const handleContactWhatsApp = () => {
    const phone = '5585999999999';
    const message = encodeURIComponent(
      `Olá! Gostaria de solicitar o cancelamento da minha assinatura do plano ${planName}.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="manage-modal-overlay" onClick={onClose}>
      <div className="manage-modal" onClick={(e) => e.stopPropagation()}>
        <button className="manage-modal__close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="manage-modal__header">
          <div className="status-badge">
            <span className="status-dot"></span>
            Assinatura Ativa
          </div>
          <h2>Gerenciar Assinatura</h2>
          <p>Veja os detalhes e benefícios do seu plano</p>
        </div>

        <div className="subscription-card" style={{ borderImage: `${config.gradient} 1` }}>
          <div className="subscription-card__header" style={{ background: config.gradient }}>
            <div className="plan-icon-wrapper">
              <PlanIcon size={40} />
            </div>
            <h3 className="plan-title">{planName}</h3>
            <div className="plan-price-info">
              <span className="price-currency">R$</span>
              <span className="price-value">{planPrice.toFixed(2).replace('.', ',')}</span>
              <span className="price-period">/mês</span>
            </div>
          </div>

          <div className="subscription-details">
            <div className="detail-item">
              <Calendar size={20} style={{ color: config.color }} />
              <div>
                <span className="detail-label">Data de Início</span>
                <span className="detail-value">{formatDate(subscription.startDate)}</span>
              </div>
            </div>

            <div className="detail-item">
              <Calendar size={20} style={{ color: config.color }} />
              <div>
                <span className="detail-label">Próxima Cobrança</span>
                <span className="detail-value">{formatDate(subscription.nextBillingDate)}</span>
              </div>
            </div>

            <div className="detail-item">
              <CreditCard size={20} style={{ color: config.color }} />
              <div>
                <span className="detail-label">Método de Pagamento</span>
                <span className="detail-value">Cartão de Crédito</span>
              </div>
            </div>
          </div>

          <div className="benefits-section">
            <h4>✨ Seus Benefícios</h4>
            <ul className="benefits-list">
              {benefits.map((benefit, index) => (
                <li key={index}>
                  <Check size={18} style={{ color: config.color }} />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="cancellation-info">
          <div className="info-icon">
            <AlertCircle size={24} />
          </div>
          <div className="info-content">
            <h4>Precisa Cancelar?</h4>
            <p>
              Entre em contato conosco pelo WhatsApp para solicitar o cancelamento.
              Estamos prontos para ajudá-lo!
            </p>
            <button
              className="whatsapp-button"
              onClick={handleContactWhatsApp}
            >
              <FaWhatsapp size={20} />
              Falar no WhatsApp
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <Button onClick={onClose} variant="secondary">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
