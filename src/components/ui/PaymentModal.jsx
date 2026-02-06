import { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import SavedCardsModal from './SavedCardsModal';
import { getUserCards, saveCard } from '../../services/cardServices';
import { criarAssinatura, criarPagamentoAgendamento, atualizarPagamentoAgendamento, enviarNotificacaoAssinatura } from '../../services/paymentService';
import { getPixKey } from '../../services/settingsService';
import { getTermsDocument } from '../../services/termsService';
import './PaymentModal.css';

export default function PaymentModal({ isOpen, onClose, selectedPlan, currentUser, onSuccess, isAppointmentPayment = false, paymentId = null }) {
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
  const [pixTimer, setPixTimer] = useState(600);
  const [pixExpired, setPixExpired] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyCopied, setPixKeyCopied] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationToast, setValidationToast] = useState({ show: false, message: '' });
  const [termsDocUrl, setTermsDocUrl] = useState('');

  const getAvailablePaymentMethods = () => {
    if (isAppointmentPayment) {
      return ['pix', 'credit', 'debit'];
    }
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
  useEffect(() => {
  const loadTermsDoc = async () => {
    try {
      const data = await getTermsDocument();
      setTermsDocUrl(data.documentUrl || '');
    } catch (error) {
      console.error('Erro ao carregar documento de termos:', error);
    }
  };
  
  if (isOpen) {
    loadTermsDoc();
  }
}, [isOpen]);

  useEffect(() => {
    if (isOpen && paymentMethod === 'pix') {
      const loadPixKey = async () => {
        try {
          const data = await getPixKey();
          setPixKey(data.pixKey || '');
        } catch (error) {
          console.error('Erro ao carregar chave PIX:', error);
        }
      };
      loadPixKey();
    }
  }, [isOpen, paymentMethod]);

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

  useEffect(() => {
    if (paymentMethod === 'pix') {
      setPixTimer(600);
      setPixExpired(false);
    }
  }, [paymentMethod]);

  useEffect(() => {
    setShowErrorToast(false);
    setErrorMessage('');
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

  const handleCopyPixKey = () => {
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      setPixKeyCopied(true);
      setTimeout(() => setPixKeyCopied(false), 3000);
    }
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
    setCardData((prev) => ({ ...prev, brand }));
    const matches = cleaned.match(/.{1,4}/g);
    return matches ? matches.join(' ') : '';
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 16) {
      const formatted = formatCardNumber(value);
      setCardData((prev) => ({ ...prev, number: formatted }));
    }
  };

  const handleExpiryChange = (field, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (field === 'expiryMonth' && cleaned.length <= 2) {
      const num = parseInt(cleaned);
      if (cleaned === '' || (num >= 1 && num <= 12)) {
        setCardData((prev) => ({ ...prev, expiryMonth: cleaned }));
      }
    } else if (field === 'expiryYear' && cleaned.length <= 2) {
      setCardData((prev) => ({ ...prev, expiryYear: cleaned }));
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const maxLength = cardData.brand === 'amex' ? 4 : 3;
    if (value.length <= maxLength) {
      setCardData((prev) => ({ ...prev, cvv: value }));
    }
  };

  const validateCardData = () => {
    const showToast = (message) => {
      setValidationToast({ show: true, message });
      setTimeout(() => {
        setValidationToast({ show: false, message: '' });
      }, 4000);
    };

    if (!isAppointmentPayment && !acceptedTerms) {
      showToast('Você precisa aceitar os termos de contratação');
      return false;
    }

    if (paymentMethod === 'credit' || paymentMethod === 'debit') {
      if (cardData.savedCardId) {
        if (!cardData.cvv || cardData.cvv.length < 3) {
          showToast('CVV é obrigatório');
          return false;
        }
        return true;
      }

      const cardNumber = cardData.number.replace(/\s/g, '');
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        showToast('Número do cartão inválido');
        return false;
      }

      if (!cardData.holderName.trim()) {
        showToast('Nome do titular é obrigatório');
        return false;
      }

      if (!cardData.expiryMonth || !cardData.expiryYear) {
        showToast('Data de validade é obrigatória');
        return false;
      }

      const month = parseInt(cardData.expiryMonth);
      const year = parseInt('20' + cardData.expiryYear);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        showToast('Cartão expirado');
        return false;
      }

      if (!cardData.cvv || cardData.cvv.length < 3) {
        showToast('CVV inválido');
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
    setShowErrorToast(false);
    setErrorMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 7000));


      const finalAmount = getFinalPrice();
      const paymentMethodString = paymentMethod === 'credit' ? 'credito' : paymentMethod === 'debit' ? 'debito' : 'pix';

      if (isAppointmentPayment) {
        if (selectedPlan.needsCreation && selectedPlan.appointmentData && selectedPlan.paymentData) {
          const appointmentResponse = await fetch('http://localhost:3000/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedPlan.appointmentData)
          });

          if (!appointmentResponse.ok) {
            throw new Error('Erro ao criar agendamento');
          }

          const createdAppointment = await appointmentResponse.json();

          const paymentData = {
            ...selectedPlan.paymentData,
            appointmentId: createdAppointment.id,
            status: 'paid',
            paymentMethod: paymentMethodString,
            paidAt: new Date().toISOString(),
            amount: finalAmount,
            cardData: paymentMethod === 'credit' || paymentMethod === 'debit' ? {
              brand: cardData.brand,
              lastDigits: cardData.savedCardId ? cardData.number.slice(-4) : cardData.number.replace(/\s/g, '').slice(-4),
              holderName: cardData.holderName
            } : undefined
          };

          await criarPagamentoAgendamento(paymentData);
        } else if (paymentId) {
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
        const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

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
          installmentAmount: (finalAmount / (paymentMethod === 'credit' ? installments : 1)).toFixed(2)
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
      setErrorMessage('Pagamento não confirmado. Gostaria de selecionar outra forma de pagamento ou tentar novamente?');
      setShowErrorToast(true);
      setProcessing(false);
      return;
    }
  };

  const handleCloseErrorToast = () => {
    setShowErrorToast(false);
    setErrorMessage('');
  };

  const getButtonLabel = () => {
    if (paymentMethod === 'pix') {
      return 'Confirmar Pagamento';
    }
    return 'Finalizar Pagamento';
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
        <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={onClose}>×</button>

          <div className="payment-modal-header">
            <h2>Pagamento</h2>
            <p className="payment-modal-subtitle">
              Complete os dados para finalizar sua compra
            </p>

            {showErrorToast && (
              <div className="payment-error-toast">
                <div className="payment-error-toast__icon">⚠️</div>
                <div className="payment-error-toast__content">
                  <p>{errorMessage}</p>
                </div>
                <button className="payment-error-toast__close" onClick={handleCloseErrorToast}>
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="payment-modal-body">
            <div className="payment-plan-summary">
              <h3>Plano: {selectedPlan.name}</h3>
              <div className="payment-plan-price">
                R$ {getFinalPrice().toFixed(2)}
              </div>
            </div>

            <div className="payment-methods">
              {availableMethods.includes('pix') && (
                <button
                  type="button"
                  className={`payment-method-btn ${paymentMethod === 'pix' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('pix')}
                >
                  PIX
                </button>
              )}
              {availableMethods.includes('credit') && (
                <button
                  type="button"
                  className={`payment-method-btn ${paymentMethod === 'credit' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('credit')}
                >
                  Crédito
                </button>
              )}
              {availableMethods.includes('debit') && (
                <button
                  type="button"
                  className={`payment-method-btn ${paymentMethod === 'debit' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('debit')}
                >
                  Débito
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {paymentMethod === 'pix' && (
                <div className="pix-payment-section">
                  <div className="pix-timer">
                    Tempo restante: {pixExpired ? 'EXPIRADO' : formatTime(pixTimer)}
                  </div>

                  {pixKey && !pixExpired && (
                    <div className="pix-key-section">
                      <div className="pix-qrcode">
                        <div className="pix-qrcode-placeholder">
                          <p>QR Code PIX</p>
                        </div>
                      </div>

                      <h4>Chave PIX</h4>
                      <div className="pix-key-container">
                        <input 
                          type="text" 
                          value={pixKey} 
                          readOnly 
                          className="pix-key-input" 
                        />
                        <button
                          type="button"
                          onClick={handleCopyPixKey}
                          className={`pix-copy-btn ${pixKeyCopied ? 'copied' : ''}`}
                        >
                          {pixKeyCopied ? '✓ Copiado!' : 'Copiar Chave'}
                        </button>
                      </div>

                      <div className="pix-instructions">
                        <h4>Como pagar</h4>
                        <ol>
                          <li>Abra o app do seu banco</li>
                          <li>Escaneie o QR Code ou copie a chave PIX</li>
                          <li>Confirme o pagamento</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {pixExpired && (
                    <div className="pix-expired">
                      O tempo para pagamento expirou. Por favor, selecione outro método de pagamento ou feche e tente novamente.
                    </div>
                  )}
                </div>
              )}

              {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                <div className="card-form">
                  {hasCards && (
                    <div className="saved-cards-section">
                      <button
                        type="button"
                        className="use-saved-card-button"
                        onClick={() => setShowSavedCards(true)}
                      >
                        Usar cartão salvo
                      </button>
                    </div>
                  )}

                  <Input
                    label="Número do Cartão"
                    value={cardData.number}
                    onChange={handleCardNumberChange}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    disabled={!!cardData.savedCardId}
                  />

                  <Input
                    label="Nome do Titular"
                    value={cardData.holderName}
                    onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })}
                    placeholder="Como está no cartão"
                    disabled={!!cardData.savedCardId}
                  />

                  <div className="card-form-row">
                    <div className="card-form-col">
                      <label>Validade</label>
                      <div className="card-expiry-inputs">
                        <input
                          type="text"
                          value={cardData.expiryMonth}
                          onChange={(e) => handleExpiryChange('expiryMonth', e.target.value)}
                          placeholder="MM"
                          maxLength={2}
                          disabled={!!cardData.savedCardId}
                        />
                        <span>/</span>
                        <input
                          type="text"
                          value={cardData.expiryYear}
                          onChange={(e) => handleExpiryChange('expiryYear', e.target.value)}
                          placeholder="AA"
                          maxLength={2}
                          disabled={!!cardData.savedCardId}
                        />
                      </div>
                    </div>

                    <div className="card-form-col">
                      <Input
                        label="CVV"
                        value={cardData.cvv}
                        onChange={handleCvvChange}
                        placeholder="123"
                        maxLength={cardData.brand === 'amex' ? 4 : 3}
                      />
                    </div>
                  </div>

                  {paymentMethod === 'credit' && !isAppointmentPayment && (
                    <div className="installments-section">
                      <label>Parcelas</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
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
                    <div className="save-card-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={saveCardOption}
                          onChange={(e) => setSaveCardOption(e.target.checked)}
                        />
                        <span>Salvar cartão para próximas compras</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

            {!isAppointmentPayment && (
  <div className="payment-terms-section">
    <div className="payment-terms-box">
      <h4>📋 Termos de Contratação</h4>
      <p>
        Ao contratar nosso plano de assinatura, você concorda com os termos e condições estabelecidos.
      </p>
      {termsDocUrl && (
        <a
          href={termsDocUrl}
          download
          className="payment-terms-download"
          target="_blank"
          rel="noopener noreferrer"
        >
          📄 Baixar Contrato Completo
        </a>
      )}
    </div>

    <label className="payment-terms-checkbox">
      <input
        type="checkbox"
        checked={acceptedTerms}
        onChange={(e) => setAcceptedTerms(e.target.checked)}
      />
      <span>
        Li e aceito os{' '}
        {termsDocUrl ? (
          <a
            href={termsDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#c4a053', textDecoration: 'underline' }}
            onClick={(e) => e.stopPropagation()}
          >
            termos de contratação
          </a>
        ) : (
          <span style={{ color: '#c4a053' }}>termos de contratação</span>
        )}
      </span>
    </label>
  </div>
)}

              {!isAppointmentPayment && (
                <div className="payment-recurring-info">
                  ℹ️ Seu cartão será registrado para pagamento recorrente automático
                </div>
              )}

              <div className="payment-modal-footer">
                <button 
                  type="button" 
                  onClick={onClose} 
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing || (paymentMethod === 'pix' && pixExpired)}
                >
                  {processing ? 'Processando...' : getButtonLabel()}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {validationToast.show && (
        <div className="toast-notification">
          <div className="toast-notification__content">
            <div className="toast-notification__icon">⚠️</div>
            <p>{validationToast.message}</p>
          </div>
          <button 
            className="toast-notification__close"
            onClick={() => setValidationToast({ show: false, message: '' })}
          >
            ×
          </button>
        </div>
      )}

      {processing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="processing-spinner-large"></div>
            <h2>Processando Pagamento...</h2>
            <p>Aguarde enquanto confirmamos sua transação</p>
            <div className="processing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

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
