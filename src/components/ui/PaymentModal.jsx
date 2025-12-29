import { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import SavedCardsModal from './SavedCardsModal';
import { getUserCards, saveCard } from '../../services/cardServices';
import { criarAssinatura, criarPagamentoAgendamento, atualizarPagamentoAgendamento } from '../../services/paymentService';
import './PaymentModal.css';

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  selectedPlan, 
  currentUser, 
  onSuccess, 
  isAppointmentPayment = false, 
  paymentId = null 
}) {
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [cardData, setCardData] = useState({
    number: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    brand: 'unknown'
  });
  const [saveCardOption, setSaveCardOption] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSavedCards, setShowSavedCards] = useState(false);
  const [hasCards, setHasCards] = useState(false);
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      checkUserCards();
    }
  }, [isOpen, currentUser]);

  const checkUserCards = async () => {
    try {
      console.log('Verificando cartões para usuário:', currentUser.id);
      const cards = await getUserCards(currentUser.id);
      console.log('Cartões encontrados:', cards);
      setHasCards(cards.length > 0);
    } catch (error) {
      console.error('Erro ao verificar cartões:', error);
      setHasCards(false);
    }
  };

  const handleSelectSavedCard = (card) => {
    console.log('Preenchendo dados do cartão selecionado:', card);
    setCardData({
      number: `•••• •••• •••• ${card.lastDigits}`,
      holderName: card.holderName,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: '',
      brand: card.brand,
      savedCardId: card.id
    });
    setShowSavedCards(false);
  };

  const detectCardBrand = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^(636368|438935|504175|451416|636297)/.test(cleaned)) return 'elo';
    if (/^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)/.test(cleaned)) return 'discover';
    return 'unknown';
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const brand = detectCardBrand(cleaned);
    setCardData(prev => ({ ...prev, brand }));
    const matches = cleaned.match(/.{1,4}/g);
    return matches ? matches.join(' ') : '';
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 16) {
      const formatted = formatCardNumber(value);
      setCardData(prev => ({ ...prev, number: formatted }));
    }
  };

  const handleExpiryChange = (field, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (field === 'expiryMonth' && cleaned.length <= 2) {
      const num = parseInt(cleaned);
      if (cleaned === '' || (num >= 1 && num <= 12)) {
        setCardData(prev => ({ ...prev, expiryMonth: cleaned }));
      }
    } else if (field === 'expiryYear' && cleaned.length <= 2) {
      setCardData(prev => ({ ...prev, expiryYear: cleaned }));
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCardData(prev => ({ ...prev, cvv: value }));
    }
  };

  const validateCardData = () => {
    if (paymentMethod === 'credit' || paymentMethod === 'debit') {
      if (cardData.savedCardId) {
        if (!cardData.cvv || cardData.cvv.length < 3) {
          alert('CVV é obrigatório');
          return false;
        }
        return true;
      }

      const cardNumber = cardData.number.replace(/\s/g, '');
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        alert('Número do cartão inválido');
        return false;
      }

      if (!cardData.holderName.trim()) {
        alert('Nome do titular é obrigatório');
        return false;
      }

      if (!cardData.expiryMonth || !cardData.expiryYear) {
        alert('Data de validade é obrigatória');
        return false;
      }

      const month = parseInt(cardData.expiryMonth);
      const year = parseInt('20' + cardData.expiryYear);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        alert('Cartão expirado');
        return false;
      }

      if (!cardData.cvv || cardData.cvv.length < 3) {
        alert('CVV inválido');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCardData()) {
      return;
    }

    setProcessing(true);

    try {
      if (isAppointmentPayment && paymentId) {
        await atualizarPagamentoAgendamento(paymentId, {
          status: 'paid',
          paymentMethod: paymentMethod === 'credit' ? 'credito' : 
                        paymentMethod === 'debit' ? 'debito' : 'pix',
          paidAt: new Date().toISOString(),
          cardData: {
            brand: cardData.brand,
            lastDigits: cardData.savedCardId 
              ? cardData.number.slice(-4) 
              : cardData.number.replace(/\s/g, '').slice(-4),
            holderName: cardData.holderName
          }
        });

        if (saveCardOption && (paymentMethod === 'credit' || paymentMethod === 'debit') && !cardData.savedCardId) {
          await saveCard({
            userId: currentUser.id,
            number: cardData.number.replace(/\s/g, ''),
            lastDigits: cardData.number.replace(/\s/g, '').slice(-4),
            holderName: cardData.holderName,
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            brand: cardData.brand,
            isMain: false
          });
        }

        onSuccess && onSuccess();
      } else {
        const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
        
        const paymentData = {
          userId: currentUser.id,
          userName: currentUser.name,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          paymentMethod: paymentMethod === 'credit' ? 'credito' : 
                        paymentMethod === 'debit' ? 'debito' : 'pix',
          status: 'approved',
          type: 'subscription',
          transactionId,
          cardData: {
            brand: cardData.brand,
            lastDigits: cardData.savedCardId 
              ? cardData.number.slice(-4) 
              : cardData.number.replace(/\s/g, '').slice(-4),
            holderName: cardData.holderName
          },
          installments: paymentMethod === 'credit' ? installments : 1,
          installmentAmount: (selectedPlan.price / (paymentMethod === 'credit' ? installments : 1)).toFixed(2)
        };

        await criarPagamentoAgendamento(paymentData);

        const subscriptionData = {
          userId: currentUser.id,
          userName: currentUser.name,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          planPrice: selectedPlan.price,
          amount: selectedPlan.price,
          status: 'active',
          paymentMethod: paymentMethod === 'credit' ? 'credito' : 
                        paymentMethod === 'debit' ? 'debito' : 'pix'
        };

        const subscription = await criarAssinatura(subscriptionData);

        if (saveCardOption && (paymentMethod === 'credit' || paymentMethod === 'debit') && !cardData.savedCardId) {
          await saveCard({
            userId: currentUser.id,
            number: cardData.number.replace(/\s/g, ''),
            lastDigits: cardData.number.replace(/\s/g, '').slice(-4),
            holderName: cardData.holderName,
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            brand: cardData.brand,
            isMain: false
          });
        }

        onSuccess && onSuccess(subscription);
      }

      setCardData({
        number: '',
        holderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        brand: 'unknown'
      });
      setSaveCardOption(false);
    } catch (error) {
      console.error('Erro no pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const getInstallmentText = (num) => {
    const value = selectedPlan.price / num;
    return `${num}x de R$ ${value.toFixed(2)}${num === 1 ? ' à vista' : ''}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Pagamento</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="payment-modal-scroll">
            <div className="payment-summary">
              <h3>{selectedPlan.name}</h3>
              <p className="payment-amount">R$ {selectedPlan.price.toFixed(2)}</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="payment-methods">
                <label className="payment-method-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit"
                    checked={paymentMethod === 'credit'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Cartão de Crédito</span>
                </label>

                <label className="payment-method-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="debit"
                    checked={paymentMethod === 'debit'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Cartão de Débito</span>
                </label>

                <label className="payment-method-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pix"
                    checked={paymentMethod === 'pix'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>PIX</span>
                </label>
              </div>

              {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                <div className="card-form">
                  {hasCards && (
                    <button
                      type="button"
                      onClick={() => setShowSavedCards(true)}
                      style={{
                        padding: '0.75rem',
                        background: '#2a2a2a',
                        border: '2px solid #333',
                        borderRadius: '0.5rem',
                        color: '#ff7a1a',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      Usar cartão salvo
                    </button>
                  )}

                  <div>
                    <label style={{ color: '#ccc' }}>Número do Cartão</label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      value={cardData.number}
                      onChange={handleCardNumberChange}
                      disabled={!!cardData.savedCardId}
                    />
                  </div>

                  <div>
                    <label style={{ color: '#ccc' }}>Nome do Titular</label>
                    <input
                      type="text"
                      placeholder="Nome como está no cartão"
                      value={cardData.holderName}
                      onChange={(e) => setCardData(prev => ({ ...prev, holderName: e.target.value }))}
                      disabled={!!cardData.savedCardId}
                    />
                  </div>

                  <div className="card-details">
                    <div className="card-expiry">
                      <label style={{ color: '#ccc' }}>Validade</label>
                      <div className="expiry-inputs">
                        <input
                          type="text"
                          placeholder="MM"
                          maxLength="2"
                          value={cardData.expiryMonth}
                          onChange={(e) => handleExpiryChange('expiryMonth', e.target.value)}
                          disabled={!!cardData.savedCardId}
                        />
                        <span>/</span>
                        <input
                          type="text"
                          placeholder="AA"
                          maxLength="2"
                          value={cardData.expiryYear}
                          onChange={(e) => handleExpiryChange('expiryYear', e.target.value)}
                          disabled={!!cardData.savedCardId}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ color: '#ccc' }}>CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardData.cvv}
                        onChange={handleCvvChange}
                      />
                    </div>
                  </div>

                  {!cardData.savedCardId && (
                    <label className="save-card-option">
                      <input
                        type="checkbox"
                        checked={saveCardOption}
                        onChange={(e) => setSaveCardOption(e.target.checked)}
                      />
                      <span>Salvar cartão para compras futuras</span>
                    </label>
                  )}

                  {paymentMethod === 'credit' && (
                    <div className="installments-section">
                      <label style={{ color: '#ccc' }}>Parcelas</label>
                      <select
                        className="installments-select"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                          <option key={num} value={num}>
                            {getInstallmentText(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'pix' && (
                <div className="pix-info">
                  <p>Ao confirmar, você receberá um código PIX para pagamento.</p>
                  <p className="pix-note">O pagamento será confirmado em até 5 minutos.</p>
                </div>
              )}
            </form>
          </div>

  
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={processing}>
              Cancelar
            </button>
            <button type="submit" onClick={handleSubmit} disabled={processing}>
              {processing ? 'Processando...' : 'Finalizar'}
            </button>
          </div>
        </div>
      </div>

      {showSavedCards && (
        <SavedCardsModal
          isOpen={showSavedCards}
          onClose={() => setShowSavedCards(false)}
          onSelectCard={handleSelectSavedCard}
          userId={currentUser.id}
        />
      )}
    </>
  );
}
