import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from './Button.jsx';
import PaymentModal from './PaymentModal.jsx';
import Toast from './Toast.jsx';
import './SubscriptionSection.css';

export default function SubscriptionSection({ activeSubscription, onSubscribe }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch('http://localhost:3000/subscriptionPlans');
        const data = await response.json();
        setPlans(data);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
      }
    };

    loadPlans();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  if (activeSubscription) return null;

  const calculateSavings = (price, cutsPerMonth) => {
    const regularPrice = 50;
    const monthlyCost = regularPrice * cutsPerMonth;
    const savings = monthlyCost - price;
    const savingsPercent = ((savings / monthlyCost) * 100).toFixed(0);
    return { savings, savingsPercent };
  };

  const handleSelectPlan = (plan) => {
    if (!currentUser) {
      showToast('Por favor, faça login para assinar um plano.', 'danger');
      return;
    }

    if (onSubscribe) {
      onSubscribe(plan);
      return;
    }

    const planWithRecurring = {
      ...plan,
      isRecurring: true,
      autoRenewal: true,
    };
    setSelectedPlan(planWithRecurring);
    setIsModalOpen(true);
  };

  const handlePaymentSuccess = (subscription) => {
    showToast(`Assinatura realizada com sucesso! Bem-vindo ao plano ${selectedPlan.name}`, 'success');
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  return (
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
            const cutsPerMonth = plan.id === 'basic' ? 2 : 4;
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
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((feature, index) => (
                      <li key={index} className="subscription-plan__feature">
                        <Check className="subscription-plan__feature-icon" size={20} />
                        {feature}
                      </li>
                    ))
                  ) : (
                    <li className="subscription-plan__feature" style={{ opacity: 0.5 }}>
                      <Check className="subscription-plan__feature-icon" size={20} />
                      Nenhum benefício cadastrado
                    </li>
                  )}
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
            ✓ Cancele quando quiser • Sem taxas de cancelamento
          </p>
        </div>
      </div>

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

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </section>
  );
}
