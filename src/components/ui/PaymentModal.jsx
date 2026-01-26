import { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import SavedCardsModal from './SavedCardsModal';
import { getUserCards, saveCard } from '../../services/cardServices';
import { criarAssinatura, criarPagamentoAgendamento, atualizarPagamentoAgendamento, enviarNotificacaoAssinatura } from '../../services/paymentService';
import './PaymentModal.css';

export default function PaymentModal({ isOpen, onClose, selectedPlan, currentUser, onSuccess, isAppointmentPayment = false, paymentId = null }) {
  // Estado inicial ajustado baseado no tipo de pagamento
  const [paymentMethod, setPaymentMethod] = useState(
    isAppointmentPayment ? 'pix' : 'credit'
  );
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
  
  // Estados do timer PIX
  const [pixTimer, setPixTimer] = useState(600); // 600 segundos = 10 minutos
  const [pixExpired, setPixExpired] = useState(false);

  // Função para determinar métodos de pagamento disponíveis
  const getAvailablePaymentMethods = () => {
    if (isAppointmentPayment) {
      // Para agendamentos: todos os métodos
      return ['pix', 'credit', 'debit'];
    }
    // Para assinaturas: apenas crédito
    return ['credit'];
  };

  const availableMethods = getAvailablePaymentMethods();

  const getFinalPrice = () => {
    if (isAppointmentPayment) {
      return selectedPlan.price;
    }
    if (paymentMethod === 'credit') {
      return selectedPlan.price * 1.05;
    }
    return selectedPlan.price;
  };

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      checkUserCards();
    }
  }, [isOpen, currentUser]);

  // Timer do PIX
  useEffect(() => {
    let interval;
    
    if (isOpen && paymentMethod === 'pix' && !pixExpired) {
      interval = setInterval(() => {
        setPixTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPixExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOpen, paymentMethod, pixExpired]);

  // Reseta o timer quando muda o método de pagamento
  useEffect(() => {
    if (paymentMethod === 'pix') {
      setPixTimer(600);
      setPixExpired(false);
    }
  }, [paymentMethod]);

  const checkUserCards = async () => {
    try {
      const cards = await getUserCards(currentUser.id);
      setHasCards(cards.length > 0);
    } catch (error) {
      setHasCards(false);
    }
  };

  const handleSelectSavedCard = (card) => {
    setCardData({
      number: `•••• •••• •••• ${card.lastDigits}`,
      holderName: card.holderName,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: '',
      brand: card.brand || 'unknown',
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
    const maxLength = cardData.brand === 'amex' ? 4 : 3;
    if (value.length <= maxLength) {
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

    if (paymentMethod === 'pix' && pixExpired) {
      return;
    }

    if (!validateCardData()) {
      return;
    }

    setProcessing(true);

    try {
      const finalAmount = getFinalPrice();
      const paymentMethodString = paymentMethod === 'credit' ? 'credito' : paymentMethod === 'debit' ? 'debito' : 'pix';

      if (isAppointmentPayment) {
        if (paymentId) {
          await atualizarPagamentoAgendamento(paymentId, {
            status: 'paid',
            paymentMethod: paymentMethodString,
            paidAt: new Date().toISOString(),
            amount: finalAmount,
            cardData: paymentMethod === 'credit' || paymentMethod === 'debit' ? {
              brand: cardData.brand,
              lastDigits: cardData.savedCardId ? cardData.number.slice(-4) : cardData.number.replace(/\s/g, '').slice(-4),
              holderName: cardData.holderName
            } : undefined
          });
        }

        if (
          saveCardOption &&
          (paymentMethod === 'credit' || paymentMethod === 'debit') &&
          !cardData.savedCardId
        ) {
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

        onSuccess && onSuccess(paymentMethodString);
      } else {
        const transactionId = `TRX-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 7)
          .toUpperCase()}`;

        const paymentData = {
          userId: currentUser.id,
          userName: currentUser.name,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: finalAmount,
          paymentMethod: paymentMethodString,
          status: 'approved',
          type: 'subscription',
          transactionId,
          cardData: paymentMethod === 'credit' || paymentMethod === 'debit' ? {
            brand: cardData.brand,
            lastDigits: cardData.savedCardId ? cardData.number.slice(-4) : cardData.number.replace(/\s/g, '').slice(-4),
            holderName: cardData.holderName
          } : undefined,
          installments: paymentMethod === 'credit' ? installments : 1,
          installmentAmount: (
            finalAmount / (paymentMethod === 'credit' ? installments : 1)
          ).toFixed(2)
        };

        await criarPagamentoAgendamento(paymentData);

        const subscriptionData = {
          userId: currentUser.id,
          userName: currentUser.name,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          planPrice: selectedPlan.price,
          amount: finalAmount,
          status: 'active',
          paymentMethod: paymentMethodString,
          isRecurring: selectedPlan.isRecurring ?? true,
          autoRenewal: selectedPlan.autoRenewal ?? true
        };

        const subscription = await criarAssinatura(subscriptionData);

        try {
          await enviarNotificacaoAssinatura(subscription);
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }

        if (
          saveCardOption &&
          (paymentMethod === 'credit' || paymentMethod === 'debit') &&
          !cardData.savedCardId
        ) {
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
    const value = getFinalPrice() / num;
    return `${num}x de R$ ${value.toFixed(2)}${num === 1 ? ' à vista' : ''}`;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal__close" onClick={onClose}>
            ×
          </button>

          <div className="payment-modal__header">
            <h2>Finalizar Pagamento</h2>
            <p>
              {isAppointmentPayment 
                ? 'Complete o pagamento do seu agendamento' 
                : 'Escolha a forma de pagamento para sua assinatura'}
            </p>
          </div>

          <div className="payment-modal__plan-info">
            <h3>{selectedPlan.name}</h3>
            <div className="payment-modal__price">
              {!isAppointmentPayment && paymentMethod === 'credit' ? (
                <>
                  <div className="payment-modal__price-old">
                    <span>De:</span>
                    <span className="old-price">R$ {selectedPlan.price.toFixed(2)}</span>
                  </div>
                  <div className="payment-modal__price-current">
                    <span>Por:</span>
                    <span className="current-price">R$ {getFinalPrice().toFixed(2)}</span>
                  </div>
                  <p className="payment-modal__price-note">Acréscimo de 5% no crédito</p>
                </>
              ) : (
                <div className="payment-modal__price-single">
                  <span className="current-price">R$ {getFinalPrice().toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="payment-methods">
            <h3 className="payment-methods__title">Forma de Pagamento</h3>
            <div className="payment-methods__buttons">
              {availableMethods.includes('pix') && (
                <button
                  className={`payment-method-btn ${paymentMethod === 'pix' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('pix')}
                >
                  <span className="payment-icon">💳</span>
                  PIX
                </button>
              )}
              {availableMethods.includes('credit') && (
                <button
                  className={`payment-method-btn ${paymentMethod === 'credit' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('credit')}
                >
                  <span className="payment-icon">💳</span>
                  Crédito
                </button>
              )}
              {availableMethods.includes('debit') && (
                <button
                  className={`payment-method-btn ${paymentMethod === 'debit' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('debit')}
                >
                  <span className="payment-icon">💳</span>
                  Débito
                </button>
              )}
            </div>
          </div>

          <form className="payment-form" onSubmit={handleSubmit}>
            {paymentMethod === 'pix' && (
              <div className="payment-form__pix">
                {/* Timer do PIX */}
                <div className={`pix-timer ${pixExpired ? 'pix-timer--expired' : ''}`}>
                  <div className="pix-timer__icon">
                    {pixExpired ? '⏱️' : '⏰'}
                  </div>
                  <div className="pix-timer__content">
                    {pixExpired ? (
                      <>
                        <span className="pix-timer__label">QR Code Expirado</span>
                      </>
                    ) : (
                      <>
                        <span className="pix-timer__label">Tempo restante para pagamento</span>
                        <span className="pix-timer__time">{formatTime(pixTimer)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="payment-form__pix-content">
                  {/* QR Code */}
                  <div className="pix-qr-section">
                    <h4 className="pix-section-title">

                      Escaneie o QR Code
                    </h4>
                    <div className="pix-qr-code">
                      <div className="pix-qr-placeholder">
                        {/* Aqui vai o QR Code real gerado pelo backend */}
                        <div className="pix-qr-mockup">
                          <div className="qr-corner qr-corner--tl"></div>
                          <div className="qr-corner qr-corner--tr"></div>
                          <div className="qr-corner qr-corner--bl"></div>
                          <div className="qr-corner qr-corner--br"></div>
                          <p className="qr-loading-text">Carregando QR Code...</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="pix-copy-btn"
                      onClick={() => {
                        // Aqui vai copiar o código PIX real do backend
                        navigator.clipboard.writeText('00020126580014br.gov.bcb.pix...');
                        alert('Código PIX copiado!');
                      }}
                    >
                       Copiar código PIX
                    </button>
                  </div>

                  {/* Instruções */}
                  <div className="pix-instructions-section">
                    <h4 className="pix-section-title">
                      Como pagar
                    </h4>
                    <div className="pix-instructions">
                      <div className="pix-step">
                        <div className="pix-step-number">1</div>
                        <div className="pix-step-content">
                          <strong>Abra seu banco</strong>
                          <p>Use o app do seu banco ou carteira digital</p>
                        </div>
                      </div>
                      <div className="pix-step">
                        <div className="pix-step-number">2</div>
                        <div className="pix-step-content">
                          <strong>Escolha pagar com PIX</strong>
                          <p>Selecione a opção PIX QR Code</p>
                        </div>
                      </div>
                      <div className="pix-step">
                        <div className="pix-step-number">3</div>
                        <div className="pix-step-content">
                          <strong>Escaneie o código</strong>
                          <p>Aponte a câmera para o QR Code acima</p>
                        </div>
                      </div>
                      <div className="pix-step">
                        <div className="pix-step-number">4</div>
                        <div className="pix-step-content">
                          <strong>Confirme o pagamento</strong>
                          <p>Revise os dados e confirme</p>
                        </div>
                      </div>
                    </div>

                    <div className="pix-info-box">
                      <span className="info-icon">ℹ️</span>
                      <p>O pagamento é processado na hora e você receberá a confirmação automaticamente.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
              <div className="payment-form__card">
                {hasCards && (
                  <div className="saved-cards-action">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowSavedCards(true)}
                    >
                      Usar cartão salvo
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label>Número do Cartão</label>
                  <Input
                    type="text"
                    value={cardData.number}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    disabled={cardData.savedCardId}
                  />
                  {cardData.brand !== 'unknown' && (
                    <span className="card-brand">{cardData.brand.toUpperCase()}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Nome do Titular</label>
                  <Input
                    type="text"
                    value={cardData.holderName}
                    onChange={(e) =>
                      setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })
                    }
                    placeholder="NOME COMO NO CARTÃO"
                    disabled={cardData.savedCardId}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Validade</label>
                    <div className="expiry-inputs">
                      <Input
                        type="text"
                        value={cardData.expiryMonth}
                        onChange={(e) => handleExpiryChange('expiryMonth', e.target.value)}
                        placeholder="MM"
                        maxLength="2"
                        disabled={cardData.savedCardId}
                      />
                      <span>/</span>
                      <Input
                        type="text"
                        value={cardData.expiryYear}
                        onChange={(e) => handleExpiryChange('expiryYear', e.target.value)}
                        placeholder="AA"
                        maxLength="2"
                        disabled={cardData.savedCardId}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>CVV</label>
                    <Input
                      type="text"
                      value={cardData.cvv}
                      onChange={handleCvvChange}
                      placeholder="123"
                      maxLength={cardData.brand === 'amex' ? '4' : '3'}
                    />
                  </div>
                </div>

                {paymentMethod === 'credit' && (
                  <div className="form-group">
                    <label>Parcelas</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                      className="installments-select"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <option key={num} value={num}>
                          {getInstallmentText(num)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!cardData.savedCardId && (
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={saveCardOption}
                        onChange={(e) => setSaveCardOption(e.target.checked)}
                      />
                      Salvar cartão para próximas compras
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="payment-form__actions">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={processing || (paymentMethod === 'pix' && pixExpired)}>
                {processing ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {showSavedCards && (
        <SavedCardsModal
          isOpen={showSavedCards}
          onClose={() => setShowSavedCards(false)}
          currentUser={currentUser}
          onSelectCard={handleSelectSavedCard}
        />
      )}
    </>
  );
}
