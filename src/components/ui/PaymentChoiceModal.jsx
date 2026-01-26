import { X, CreditCard, Store } from 'lucide-react';
import Button from './Button.jsx';
import './PaymentChoiceModal.css';

export default function PaymentChoiceModal({ 
  isOpen, 
  onClose, 
  onChoose, 
  appointmentDetails,
  purchaseData
}) {
  if (!isOpen) return null;

  const handleChoice = (payNow) => {
    onChoose(payNow);
    onClose();
  };

  const hasProducts = purchaseData?.products && purchaseData.products.length > 0;
  const isFreeForSubscriber = purchaseData?.hasActiveSubscription && !hasProducts;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-choice-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        {isFreeForSubscriber ? (
          <div className="subscription-active-message">
            <div className="success-icon">✓</div>
            <h2>Você possui um plano ativo! Seu agendamento será confirmado sem cobrança adicional.</h2>
            <div className="appointment-details-summary">
              <p><strong>Barbeiro:</strong> {appointmentDetails?.barberName}</p>
              <p><strong>Data:</strong> {appointmentDetails?.date}</p>
              <p><strong>Horário:</strong> {appointmentDetails?.time}</p>
              <p><strong>Serviço:</strong> {appointmentDetails?.serviceName}</p>
            </div>
            <div className="included-badge">
              Incluído no seu plano ativo
            </div>
            <Button onClick={() => handleChoice(false)} className="btn-confirm-free">
              Confirmar Agendamento
            </Button>
          </div>
        ) : (
          <>
            <h2>Escolha a forma de pagamento para seu agendamento</h2>
            
            {purchaseData && (
              <div className="purchase-summary">
                <div className="summary-details">
                  {hasProducts && (
                    <div className="summary-section">
                      <h4>Produtos Selecionados:</h4>
                      <ul>
                        {purchaseData.products.map((product, index) => (
                          <li key={index}>
                            {product.name} x{product.quantity} - R$ {(product.totalPrice || product.calculatedPrice * product.quantity).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="summary-totals">
                    {hasProducts && (
                      <div className="summary-row">
                        <span>Produtos:</span>
                        <span>R$ {purchaseData.productsTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {purchaseData.servicePrice > 0 && (
                      <div className="summary-row">
                        <span>Serviço:</span>
                        <span>R$ {purchaseData.servicePrice.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span><strong>Total:</strong></span>
                      <span>R$ {purchaseData.finalTotal.toFixed(2)}</span>
                    </div>
                    {purchaseData.hasActiveSubscription && (
                      <div className="subscriber-badge">
                        ✓ Desconto de assinante aplicado nos produtos
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="payment-choices">
              <div className="choice-card" onClick={() => handleChoice(true)}>
                <div className="choice-icon">
                  <CreditCard size={48} />
                </div>
                <h3>Pagar Agora</h3>
                <p>Finalize o pagamento online de forma rápida e segura</p>
                <Button className="btn-choice">Escolher</Button>
              </div>

              <div className="choice-card" onClick={() => handleChoice(false)}>
                <div className="choice-icon">
                  <Store size={48} />
                </div>
                <h3>Pagar no Local</h3>
                <p>Realize o pagamento diretamente na barbearia</p>
                <Button className="btn-choice">Escolher</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
