import { X, CreditCard, Store, Banknote } from 'lucide-react';
import Button from './Button.jsx';
import './PaymentChoiceModal.css';

export default function PaymentChoiceModal({
  isOpen,
  onClose,
  onChoose,
  appointmentDetails,
  purchaseData,
  availablePaymentMethods = ['online', 'local'],
}) {
  if (!isOpen) return null;

  const handleChoice = (method) => {
    onChoose(method);
    onClose();
  };

  const canPayCard = availablePaymentMethods.includes('cartao');
  const canPayPix = availablePaymentMethods.includes('pix');
  const canPayLocal = availablePaymentMethods.includes('local');

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

            <button className="btn-confirm-free" onClick={() => handleChoice('free')}>
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
              {canPayCard && (
                <div className="choice-card" onClick={() => handleChoice('cartao')}>
                  <div className="choice-icon">
                    <CreditCard size={28} />
                  </div>
                  <h3>Pagar no Cartão</h3>
                  <p>Finalize o pagamento com cartão de crédito ou débito</p>
                  <button className="btn-choice">Cartão</button>
                </div>
              )}

              {canPayPix && (
                <div className="choice-card" onClick={() => handleChoice('pix')}>
                  <div className="choice-icon">
                    <Banknote size={28} />
                  </div>
                  <h3>Pagar no Pix</h3>
                  <p>Finalize o pagamento com Pix de forma rápida e segura</p>
                  <button className="btn-choice">Pix</button>
                </div>
              )}

              {canPayLocal && (
                <div className="choice-card" onClick={() => handleChoice('local')}>
                  <div className="choice-icon">
                    <Store size={28} />
                  </div>
                  <h3>Pagar no Local</h3>
                  <p>Realize o pagamento diretamente na barbearia</p>
                  <button className="btn-choice">LOCAL</button>
                </div>
              )}
            </div>

            {!canPayCard && !canPayPix && !canPayLocal && (
              <p style={{ color: '#ff7a1a', textAlign: 'center', marginTop: '1rem' }}>
                Nenhuma forma de pagamento está disponível no momento.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}