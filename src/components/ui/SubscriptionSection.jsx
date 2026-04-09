import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from './Button.jsx';
import Toast from './Toast.jsx';
import './SubscriptionSection.css';
import { getToken } from '../../services/authService.js';
import AppointmentsPage from '../../pages/AppointmentsPage-backup.jsx';

const PLAN_SERVICE_FEATURE_PREFIX = 'SERVICO_INCLUSO::';

const formatBenefitLabel = (benefit) => {
  if (typeof benefit !== 'string') return benefit;

  if (benefit.startsWith(PLAN_SERVICE_FEATURE_PREFIX)) {
    const parts = benefit.split('::');
    const serviceName = parts.slice(2).join('::').trim();
    return `Serviço incluído: ${serviceName || 'Serviço'}`;
  }

  return benefit;
};

export default function SubscriptionSection({ activeSubscription, onSubscribe }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const token = getToken();

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
        const response = await fetch('https://barberone-backend.onrender.com/subscription-plans', {
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

    loadPlans();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  const activePlanName =
    activeSubscription?.planDetails?.name ||
    activeSubscription?.planName ||
    activeSubscription?.name ||
    'plano ativo';

  const activePlanNextBillingDate = activeSubscription?.nextBillingDate
    ? new Date(activeSubscription.nextBillingDate).toLocaleDateString('pt-BR')
    : null;

  if (activeSubscription) {
    return (
      <section className="subscription-section subscription-section--active" id="planos">
        <div className="subscription-section__container">
          <div className="subscription-section__header">
            <h2 className="subscription-section__title">Assinatura Ativa</h2>
            <p className="subscription-section__subtitle">
              Você já possui um plano ativo e continua com todos os benefícios liberados.
            </p>
          </div>

          <div className="subscription-section__active-card">
            <div className="subscription-section__active-badge">Plano vigente</div>
            <h3 className="subscription-section__active-title">{activePlanName}</h3>
            <p className="subscription-section__active-text">
              Seu plano já está ativo. Você não precisa assinar novamente.
            </p>

            {activePlanNextBillingDate && (
              <p className="subscription-section__active-note">
                Próxima renovação em {activePlanNextBillingDate}
              </p>
            )}

            {onSubscribe && (
              <Button
                onClick={onSubscribe}
                className="subscription-section__active-button"
              >
                Gerenciar assinatura
              </Button>
            )}
          </div>
        </div>

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

  const calculateSavings = (price, cutsPerMonth) => {
    const regularPrice = 50;
    const monthlyCost = regularPrice * cutsPerMonth;
    const savings = monthlyCost - price;
    const savingsPercent = ((savings / monthlyCost) * 100).toFixed(0);
    return { savings, savingsPercent };
  };

  const buildSubscriptionCheckoutUrl = (baseUrl, userEmail) => {
    const email = String(userEmail || '').trim();
    if (!email) return baseUrl;

    try {
      const url = new URL(baseUrl);
      url.searchParams.set('prefilled_email', email);
      return url.toString();
    } catch {
      const separator = String(baseUrl).includes('?') ? '&' : '?';
      return `${baseUrl}${separator}prefilled_email=${encodeURIComponent(email)}`;
    }
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

    const subscriptionUrl = plan?.mpSubscriptionUrl || plan?.subscriptionUrl;
    if (!subscriptionUrl) {
      showToast('Link de assinatura não configurado para esse plano.', 'danger');
      return;
    }

    const planWithRecurring = {
      ...plan,
      isRecurring: true,
      autoRenewal: true,
    };

    localStorage.setItem('selectedPlan', JSON.stringify(planWithRecurring));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    const checkoutUrl = buildSubscriptionCheckoutUrl(subscriptionUrl, currentUser?.email);
    window.location.href = checkoutUrl;
  };

  return (
    <section className="subscription-section" id='planos'>
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
                className={`subscription-plan ${plan.recommended ? 'subscription-plan--recommended' : ''
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
                        {formatBenefitLabel(feature)}
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
