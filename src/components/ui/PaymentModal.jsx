import { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import SavedCardsModal from './SavedCardsModal';
import { getUserCards, saveCard } from '../../services/cardServices';
import { 
  criarAssinatura, 
  criarPagamentoAgendamento,
  atualizarPagamentoAgendamento 
} from '../../services/paymentService';
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
          paymentMethod: paymentMethod === 'credit' ? 'credito' : paymentMethod === 'debit' ? 'debito' : 'pix',
          paidAt: new Date().toISOString(),
          cardData: {
            brand: cardData.brand,
            lastDigits: cardData.savedCardId ? cardData.number.slice(-4) : cardData.number.replace(/\s/g, '').slice(-4),
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
          paymentMethod: paymentMethod === 'credit' ? 'credito' : paymentMethod === 'debit' ? 'debito' : 'pix',
          status: 'approved',
          type: 'subscription',
          transactionId,
          cardData: {
            brand: cardData.brand,
            lastDigits: cardData.savedCardId ? cardData.number.slice(-4) : cardData.number.replace(/\s/g, '').slice(-4),
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
          paymentMethod: paymentMethod === 'credit' ? 'credito' : paymentMethod === 'debit' ? 'debito' : 'pix'
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
          {/* HEADER FIXO */}
          <div className="modal-header">
            <h2>Finalizar Pagamento</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          {/* CONTAINER COM SCROLL */}
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
                    value="credit"
                    checked={paymentMethod === 'credit'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>💳 Cartão de Crédito</span>
                </label>

                <label className="payment-method-option">
                  <input
                    type="radio"
                    value="debit"
                    checked={paymentMethod === 'debit'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>💳 Cartão de Débito</span>
                </label>

                <label className="payment-method-option">
                  <input
                    type="radio"
                    value="pix"
                    checked={paymentMethod === 'pix'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>📱 PIX</span>
                </label>
              </div>

              {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                <>
                  {hasCards && (
                    <Button 
                      type="button" 
                      onClick={() => {
                        console.log('Abrindo modal de cartões salvos');
                        setShowSavedCards(true);
                      }}
                      style={{ 
                        marginBottom: '20px', 
                        width: '100%',
                        background: '#2a2a2a',
                        color: '#d4af37'
                      }}
                    >
                      💳 Usar Cartão Salvo
                    </Button>
                  )}

                  <div className="card-form">
                    <Input
                      label="Número do Cartão"
                      value={cardData.number}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      disabled={!!cardData.savedCardId}
                      required
                    />

                    <Input
                      label="Nome do Titular"
                      value={cardData.holderName}
                      onChange={(e) => setCardData(prev => ({ 
                        ...prev, 
                        holderName: e.target.value.toUpperCase() 
                      }))}
                      placeholder="NOME COMO ESTÁ NO CARTÃO"
                      disabled={!!cardData.savedCardId}
                      required
                    />

                    <div className="card-details">
                      <div className="card-expiry">
                        <label>Validade</label>
                        <div className="expiry-inputs">
                          <input
                            type="text"
                            value={cardData.expiryMonth}
                            onChange={(e) => handleExpiryChange('expiryMonth', e.target.value)}
                            placeholder="MM"
                            maxLength="2"
                            disabled={!!cardData.savedCardId}
                            required
                          />
                          <span>/</span>
                          <input
                            type="text"
                            value={cardData.expiryYear}
                            onChange={(e) => handleExpiryChange('expiryYear', e.target.value)}
                            placeholder="AA"
                            maxLength="2"
                            disabled={!!cardData.savedCardId}
                            required
                          />
                        </div>
                      </div>

                      <Input
                        label="CVV"
                        type="text"
                        value={cardData.cvv}
                        onChange={handleCvvChange}
                        placeholder="123"
                        maxLength="4"
                        required
                      />
                    </div>

                    {!cardData.savedCardId && (
                      <label className="save-card-option">
                        <input
                          type="checkbox"
                          checked={saveCardOption}
                          onChange={(e) => setSaveCardOption(e.target.checked)}
                        />
                        <span>💾 Salvar este cartão para pagamentos futuros</span>
                      </label>
                    )}

                    {cardData.savedCardId && (
                      <div style={{ 
                        padding: '10px', 
                        background: '#d1fae5', 
                        borderRadius: '8px',
                        marginTop: '10px',
                        color: '#065f46'
                      }}>
                        ✓ Usando cartão salvo - Confirme o CVV para continuar
                      </div>
                    )}
                  </div>

                  {paymentMethod === 'credit' && !isAppointmentPayment && (
                    <div className="installments-section">
                      <label>Parcelamento</label>
                      <select 
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="installments-select"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                          <option key={num} value={num}>
                            {getInstallmentText(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {paymentMethod === 'pix' && (
                <div className="pix-info">
                  <p>📱 Após confirmar, você receberá o QR Code para pagamento via PIX.</p>
                  <p className="pix-note">O pagamento é processado instantaneamente.</p>
                </div>
              )}

              <div className="modal-actions">
                <Button type="button" onClick={onClose} disabled={processing}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={processing}>
                  {processing ? 'Processando...' : `Pagar R$ ${selectedPlan.price.toFixed(2)}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showSavedCards && (
        <SavedCardsModal
          isOpen={showSavedCards}
          onClose={() => {
            console.log('Fechando modal de cartões salvos');
            setShowSavedCards(false);
          }}
          userId={currentUser?.id}
          onSelectCard={handleSelectSavedCard}
        />
      )}
    </>
  );
}