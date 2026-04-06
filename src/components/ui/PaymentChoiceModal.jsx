import { X, CreditCard, Store } from 'lucide-react';
import Button from './Button.jsx';
import './PaymentChoiceModal.css';

export default function PaymentChoiceModal({ isOpen, onClose, onChoose, appointmentDetails, purchaseData }) {
  if (!isOpen) return null;

  const handleChoice = (payNow) => {
    onChoose(payNow);
    onClose();
  };

  const hasProducts = purchaseData?.products && purchaseData.products.length > 0;
  const isFreeForSubscriber =
    purchaseData?.hasActiveSubscription &&
    purchaseData?.serviceCoveredByPlan === true &&
    Number(purchaseData?.servicePrice || 0) === 0 &&
    Number(purchaseData?.finalTotal || 0) === 0 &&
    !hasProducts;

  return (
    <div className="modal-overlay">
      <div className="payment-choice-modal">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {isFreeForSubscriber ? (
          <div className="subscription-active-message">
            <div className="success-icon">✓</div>
            <h2>Agendamento Coberto pelo Plano!</h2>

            <div className="appointment-details-summary">
              <p><strong>Barbeiro:</strong> {appointmentDetails?.barberName}</p>
              <p><strong>Data:</strong> {appointmentDetails?.date}</p>
              <p><strong>Horário:</strong> {appointmentDetails?.time}</p>
              <p>
                <strong>Serviço:</strong>{' '}
                {appointmentDetails?.serviceName || 'Serviço não informado'}
              </p>
            </div>

            <span className="included-badge">✓ Incluído no seu plano</span>

            <button className="btn-confirm-free" onClick={() => handleChoice(false)}>
              Confirmar Agendamento
            </button>
          </div>
        ) : (
          <>
            <h2>Como deseja pagar?</h2>

            <div className="purchase-summary">
              <div className="summary-details">
                <div className="summary-section">
                  <h4>Detalhes do Agendamento</h4>
                  <ul>
                    <li><strong>Barbeiro:</strong> {appointmentDetails?.barberName}</li>
                    <li><strong>Data:</strong> {appointmentDetails?.date}</li>
                    <li><strong>Horário:</strong> {appointmentDetails?.time}</li>
                    <li>
                      <strong>Serviço:</strong>{' '}
                      {appointmentDetails?.serviceName || 'Serviço não informado'}
                    </li>
                  </ul>
                </div>

                {hasProducts && (
                  <div className="summary-section">
                    <h4>Produtos</h4>
                    <ul>
                      {purchaseData.products.map((p, i) => (
                        <li key={i}>{p.name} x{p.quantity}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="summary-totals">
                {hasProducts && (
                  <div className="summary-row">
                    <span>Serviço</span>
                    <span>R$ {purchaseData?.servicePrice?.toFixed(2)}</span>
                  </div>
                )}
                {hasProducts && (
                  <div className="summary-row">
                    <span>Produtos</span>
                    <span>R$ {purchaseData?.productsTotal?.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total</span>
                  <span>R$ {purchaseData?.finalTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="payment-choices">
              <div className="choice-card" onClick={() => handleChoice(true)}>
                <div className="choice-icon">
                  <CreditCard size={28} />
                </div>
                <h3>Pagar Online</h3>
                <p>Finalize o pagamento online de forma rápida e segura</p>
                <button className="btn-choice">Pagar Agora</button>
              </div>

              <div className="choice-card" onClick={() => handleChoice(false)}>
                <div className="choice-icon">
                  <Store size={28} />
                </div>
                <h3>Pagar no Local</h3>
                <p>Realize o pagamento diretamente na barbearia</p>
                <button className="btn-choice">Pagar no Local</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}