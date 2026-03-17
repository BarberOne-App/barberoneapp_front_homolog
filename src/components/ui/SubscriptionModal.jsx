import { X, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import PaymentModal from './PaymentModal.jsx';
import Toast from './Toast.jsx';
import './SubscriptionModal.css';
import { getToken } from '../../services/authService.js';

export default function SubscriptionModal({ isOpen, onClose, currentUser }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const token = getToken();

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch('https://barbearia-addev-backend.onrender.com/subscription-plans', {
          headers: {
            Authorization: `Bearer ${token}`
          }

        });
        const data = await response.json();
        setPlans(data);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
      }
    };

    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  if (!isOpen) return null;

  const handleSelectPlan = (plan) => {
    if (!currentUser) {
      showToast('Por favor, faça login para assinar um plano.', 'danger');
      return;
    }

    const planWithRecurring = {
      ...plan,
      isRecurring: true,
      autoRenewal: true,
    };
    setSelectedPlan(planWithRecurring);
    setShowPaymentModal(true);
    localStorage.setItem('selectedPlan', JSON.stringify(planWithRecurring));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  };

  const handlePaymentSuccess = (subscription) => {
    showToast(`Assinatura realizada com sucesso! Bem-vindo ao plano ${selectedPlan.name}`, 'success');
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
                className={`subscription-modal__plan ${plan.recommended ? 'subscription-modal__plan--popular' : ''
                  }`}
                style={{ borderColor: plan.color }}
              >
                {plan.recommended && (
                  <div
                    className="subscription-modal__badge"
                    style={{ backgroundColor: plan.color }}
                  >
                    Mais Popular
                  </div>
                )}

                <h3 className="subscription-modal__plan-name">{plan.name}</h3>

                <div className="subscription-modal__plan-price">
                  <span className="subscription-modal__currency">R$</span>
                  <span className="subscription-modal__amount">
                    {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="subscription-modal__period">/mês</span>
                </div>

                <ul className="subscription-modal__benefits">
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((benefit, index) => (
                      <li key={index} className="subscription-modal__benefit">
                        <Check size={18} />
                        <span>{benefit}</span>
                      </li>
                    ))
                  ) : (
                    <li className="subscription-modal__benefit" style={{ opacity: 0.5 }}>
                      <Check size={18} />
                      <span>Nenhum benefício cadastrado</span>
                    </li>
                  )}
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

          <div className="subscription-modal__footer">
            <p>
              ✓ Cobrança recorrente automática • ✓ Cancele quando quiser • ✓ Sem taxas de
              cancelamento
            </p>
          </div>
        </div>
      </div>

      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handleClosePayment}
          selectedPlan={selectedPlan}
          currentUser={currentUser}
          onSuccess={handlePaymentSuccess}
          isAppointmentPayment={false}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </>
  );
}
