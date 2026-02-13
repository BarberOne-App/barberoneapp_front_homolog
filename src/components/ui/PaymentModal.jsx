import { useState, useEffect, useRef } from 'react';
import Button from './Button';
import SavedCardsModal from './SavedCardsModal';
import { getUserCards, saveCard } from '../../services/cardServices';
import {
  criarAssinatura,
  criarPagamentoAgendamento,
  atualizarPagamentoAgendamento,
  enviarNotificacaoAssinatura,
} from '../../services/paymentService';
import { getPixKey } from '../../services/settingsService';
import { getTermsDocument } from '../../services/termsService';
import { processMercadoPagoPayment } from '../../services/mercadoPagoService';
import './PaymentModal.css';

const SUBSCRIPTION_LINKS = {
  150: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=248f6838b5a0470c96b23a4edd1905d8',
  89.9: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=6a4820f29af0439eaedd4ffa13a0acbf',
};

export default function PaymentModal({
  isOpen,
  onClose,
  selectedPlan,
  currentUser,
  onSuccess,
  isAppointmentPayment = false,
  paymentId = null,
}) {
  const [paymentMethod, setPaymentMethod] = useState(isAppointmentPayment ? 'pix' : 'credit');
  const [processing, setProcessing] = useState(false);
  const [showSavedCards, setShowSavedCards] = useState(false);
  const [hasCards, setHasCards] = useState(false);
  const [pixTimer, setPixTimer] = useState(600);
  const [pixExpired, setPixExpired] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyCopied, setPixKeyCopied] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationToast, setValidationToast] = useState({ show: false, message: '' });
  const [termsDocUrl, setTermsDocUrl] = useState('');
  const [mercadoPagoInstance, setMercadoPagoInstance] = useState(null);
  const [brickController, setBrickController] = useState(null);
  const [brickLoaded, setBrickLoaded] = useState(false);

  const cardPaymentBrickRef = useRef(null);
  const isRenderingBrick = useRef(false);

  const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-b1b4acc6-b66a-4a00-abdf-b31df28a8d7e';

  const isRecurringSubscription = !isAppointmentPayment && selectedPlan?.isRecurring;

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
    if (
      !isRecurringSubscription &&
      !window.MercadoPago &&
      isOpen &&
      (paymentMethod === 'credit' || paymentMethod === 'debit')
    ) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => {
        const mp = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, {
          locale: 'pt-BR',
        });
        setMercadoPagoInstance(mp);
      };
      document.body.appendChild(script);

      return () => {
        if (script.parentNode) {
          document.body.removeChild(script);
        }
      };
    } else if (!isRecurringSubscription && window.MercadoPago && !mercadoPagoInstance) {
      const mp = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, {
        locale: 'pt-BR',
      });
      setMercadoPagoInstance(mp);
    }
  }, [isOpen, paymentMethod, mercadoPagoInstance, isRecurringSubscription]);

  useEffect(() => {
    if (
      !isRecurringSubscription &&
      mercadoPagoInstance &&
      (paymentMethod === 'credit' || paymentMethod === 'debit') &&
      isOpen &&
      !brickLoaded &&
      !isRenderingBrick.current
    ) {
      renderCardPaymentBrick();
    }

    return () => {
      if (brickController && !isOpen) {
        brickController.unmount();
        setBrickController(null);
        setBrickLoaded(false);
      }
    };
  }, [mercadoPagoInstance, paymentMethod, isOpen, brickLoaded, isRecurringSubscription]);

  useEffect(() => {
    if (paymentMethod === 'pix' && brickController) {
      brickController.unmount();
      setBrickController(null);
      setBrickLoaded(false);
    }
  }, [paymentMethod]);

  const renderCardPaymentBrick = async () => {
    if (isRenderingBrick.current) {
      console.log('⚠️ Brick já está sendo renderizado, ignorando...');
      return;
    }

    isRenderingBrick.current = true;

    try {
      if (brickController) {
        console.log('🧹 Limpando brick anterior...');
        await brickController.unmount();
        setBrickController(null);
      }

      const container = document.getElementById('cardPaymentBrick_container');
      if (container) {
        container.innerHTML = '';
      }

      console.log('🔄 Renderizando Card Payment Brick...');

      const bricksBuilder = mercadoPagoInstance.bricks();

      const controller = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
        initialization: {
          amount: getFinalPrice(),
        },
        customization: {
          visual: {
            style: {
              theme: 'dark',
              customVariables: {
                baseColor: '#ff7a1a',
                textPrimaryColor: '#ffffff',
                textSecondaryColor: '#b0b0b0',
                inputBackgroundColor: '#242424',
                formBackgroundColor: '#1a1a1a',
                borderRadiusSmall: '8px',
                borderRadiusMedium: '12px',
                borderRadiusLarge: '16px',
              },
            },
          },
          paymentMethods: {
            maxInstallments: paymentMethod === 'credit' ? 12 : 1,
            minInstallments: 1,
            types: {
              excluded: paymentMethod === 'debit' ? ['credit_card'] : ['debit_card'],
            },
          },
        },
        callbacks: {
          onReady: () => {
            console.log('✅ Card Payment Brick pronto');
            setBrickLoaded(true);
            isRenderingBrick.current = false;
          },
          onSubmit: async (cardFormData) => {
            return handleMercadoPagoSubmit(cardFormData);
          },
          onError: (error) => {
            console.error('❌ Erro no Card Payment Brick:', error);
            setErrorMessage('Erro ao processar pagamento. Verifique os dados do cartão.');
            setShowErrorToast(true);
            isRenderingBrick.current = false;
          },
        },
      });

      setBrickController(controller);
    } catch (error) {
      console.error('❌ Erro ao renderizar Card Payment Brick:', error);
      setErrorMessage('Erro ao carregar formulário de pagamento. Tente novamente.');
      setShowErrorToast(true);
      isRenderingBrick.current = false;
    }
  };

  const handleMercadoPagoSubmit = async (cardFormData) => {
    console.log('🔵 Iniciando processo de pagamento...');

    if (!isAppointmentPayment && !acceptedTerms) {
      setValidationToast({ show: true, message: 'Você precisa aceitar os termos de contratação' });
      setTimeout(() => setValidationToast({ show: false, message: '' }), 4000);
      return new Promise((_, reject) => reject(new Error('Terms not accepted')));
    }

    setProcessing(true);
    setShowErrorToast(false);
    setErrorMessage('');

    try {
      const paymentData = {
        token: cardFormData.token,
        transaction_amount: getFinalPrice(),
        installments: cardFormData.installments,
        payment_method_id: cardFormData.payment_method_id,
        issuer_id: cardFormData.issuer_id,
        payer: {
          email: currentUser.email || `${currentUser.id}@barbearia.com`,
          identification: {
            type: cardFormData.payer.identification.type,
            number: cardFormData.payer.identification.number,
          },
        },
        description: isAppointmentPayment
          ? `Pagamento - ${selectedPlan.serviceName || 'Serviço'}`
          : `Assinatura - ${selectedPlan.name}`,
      };

      console.log('💳 Processando pagamento com Mercado Pago...');
      const paymentResult = await processMercadoPagoPayment(paymentData);
      console.log('✅ Pagamento processado:', paymentResult);

      if (paymentResult.status === 'approved' || paymentResult.status === 'authorized') {
        const finalAmount = getFinalPrice();
        const paymentMethodString = paymentMethod === 'credit' ? 'credito' : 'debito';

        console.log('💾 Salvando dados no banco...');

        if (isAppointmentPayment) {
          if (
            selectedPlan.needsCreation &&
            selectedPlan.appointmentData &&
            selectedPlan.paymentData
          ) {
            console.log('📅 Criando novo agendamento...');

            try {
              const appointmentResponse = await fetch('http://localhost:3000/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedPlan.appointmentData),
              });

              if (!appointmentResponse.ok) {
                const errorText = await appointmentResponse.text();
                console.error('❌ Erro ao criar agendamento:', errorText);
                throw new Error('Erro ao criar agendamento');
              }

              const createdAppointment = await appointmentResponse.json();
              console.log('✅ Agendamento criado:', createdAppointment);

              const paymentDataToSave = {
                ...selectedPlan.paymentData,
                appointmentId: createdAppointment.id,
                status: 'paid',
                paymentMethod: paymentMethodString,
                paidAt: new Date().toISOString(),
                amount: finalAmount,
                mercadoPagoId: paymentResult.id,
                mercadoPagoStatus: paymentResult.status,
                cardData: {
                  brand: paymentResult.payment_method_id,
                  lastDigits: paymentResult.card?.last_four_digits || '****',
                },
              };

              console.log('💰 Salvando pagamento do agendamento...');
              await criarPagamentoAgendamento(paymentDataToSave);
              console.log('✅ Pagamento salvo com sucesso!');
            } catch (error) {
              console.error('❌ Erro no fluxo de agendamento:', error);
              throw error;
            }
          } else if (paymentId) {
            console.log('🔄 Atualizando pagamento existente...');
            await atualizarPagamentoAgendamento(paymentId, {
              status: 'paid',
              paymentMethod: paymentMethodString,
              paidAt: new Date().toISOString(),
              amount: finalAmount,
              mercadoPagoId: paymentResult.id,
              mercadoPagoStatus: paymentResult.status,
              cardData: {
                brand: paymentResult.payment_method_id,
                lastDigits: paymentResult.card?.last_four_digits || '****',
              },
            });
            console.log('✅ Pagamento atualizado!');
          }

          console.log('🎉 Processo de pagamento concluído com sucesso!');
          onSuccess && onSuccess(paymentMethodString);
        } else {
          console.log('📝 Criando assinatura...');
          const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

          const paymentDataToSave = {
            userId: currentUser.id,
            userName: currentUser.name,
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            amount: finalAmount,
            paymentMethod: paymentMethodString,
            status: 'approved',
            type: 'subscription',
            transactionId,
            mercadoPagoId: paymentResult.id,
            mercadoPagoStatus: paymentResult.status,
            installments: cardFormData.installments || 1,
            installmentAmount: (finalAmount / (cardFormData.installments || 1)).toFixed(2),
            cardData: {
              brand: paymentResult.payment_method_id,
              lastDigits: paymentResult.card?.last_four_digits || '****',
            },
            createdAt: new Date().toISOString(),
            approvedAt: new Date().toISOString(),
          };

          await criarPagamentoAgendamento(paymentDataToSave);

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
            autoRenewal: selectedPlan.autoRenewal ?? true,
          };

          const subscription = await criarAssinatura(subscriptionData);
          console.log('✅ Assinatura criada:', subscription);

          try {
            await enviarNotificacaoAssinatura(subscription);
          } catch (error) {
            console.error('⚠️ Erro ao enviar notificação (não crítico):', error);
          }

          onSuccess && onSuccess(subscription);
        }

        setProcessing(false);
        onClose();
        return { status: 'success' };
      } else if (paymentResult.status === 'pending' || paymentResult.status === 'in_process') {
        console.warn('⏳ Pagamento pendente:', paymentResult);
        setErrorMessage(
          `Pagamento pendente. Status: ${paymentResult.status_detail || 'Aguardando confirmação'}`,
        );
        setShowErrorToast(true);
        setProcessing(false);
        return new Promise((_, reject) => reject(new Error('Payment pending')));
      } else {
        console.error('❌ Pagamento rejeitado:', paymentResult);
        throw new Error(paymentResult.status_detail || 'Pagamento não aprovado');
      }
    } catch (error) {
      console.error('❌ ERRO GERAL no pagamento:', error);
      console.error('Stack trace:', error.stack);
      setErrorMessage(error.message || 'Erro ao processar pagamento. Tente novamente.');
      setShowErrorToast(true);
      setProcessing(false);
      return new Promise((_, reject) => reject(error));
    }
  };

  const handleRecurringSubscription = () => {
    if (!acceptedTerms) {
      setValidationToast({ show: true, message: 'Você precisa aceitar os termos de contratação' });
      setTimeout(() => setValidationToast({ show: false, message: '' }), 4000);
      return;
    }

    const subscriptionLink = SUBSCRIPTION_LINKS[selectedPlan.price];

    if (!subscriptionLink) {
      setErrorMessage('Plano de assinatura não encontrado. Entre em contato com o suporte.');
      setShowErrorToast(true);
      return;
    }

    window.location.href = subscriptionLink;
  };

  useEffect(() => {
    if (isOpen && currentUser?.id && !isRecurringSubscription) {
      checkUserCards();
    }
  }, [isOpen, currentUser, isRecurringSubscription]);

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

  const handleCopyPixKey = () => {
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      setPixKeyCopied(true);
      setTimeout(() => setPixKeyCopied(false), 3000);
    }
  };

  const handlePixSubmit = async (e) => {
    e.preventDefault();

    if (pixExpired) {
      return;
    }

    setProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const finalAmount = getFinalPrice();

      if (isAppointmentPayment) {
        if (
          selectedPlan.needsCreation &&
          selectedPlan.appointmentData &&
          selectedPlan.paymentData
        ) {
          const appointmentResponse = await fetch('http://localhost:3000/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedPlan.appointmentData),
          });

          if (!appointmentResponse.ok) {
            throw new Error('Erro ao criar agendamento');
          }

          const createdAppointment = await appointmentResponse.json();

          const paymentData = {
            ...selectedPlan.paymentData,
            appointmentId: createdAppointment.id,
            status: 'paid',
            paymentMethod: 'pix',
            paidAt: new Date().toISOString(),
            amount: finalAmount,
          };

          await criarPagamentoAgendamento(paymentData);
        } else if (paymentId) {
          await atualizarPagamentoAgendamento(paymentId, {
            status: 'paid',
            paymentMethod: 'pix',
            paidAt: new Date().toISOString(),
            amount: finalAmount,
          });
        }

        onSuccess && onSuccess('pix');
      }

      setProcessing(false);
      onClose();
    } catch (error) {
      console.error('Erro no pagamento PIX:', error);
      setErrorMessage('Erro ao confirmar pagamento PIX. Tente novamente.');
      setShowErrorToast(true);
      setProcessing(false);
    }
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
          <button className="payment-modal-close" onClick={onClose}>
            ×
          </button>

          <div className="payment-modal-header">
            <h2>
              {isRecurringSubscription
                ? 'Confirme sua assinatura'
                : 'Complete os dados para finalizar sua compra'}
            </h2>
            {!isAppointmentPayment && (
              <p className="payment-modal-subtitle">Assinatura do plano {selectedPlan.name}</p>
            )}
          </div>

          {showErrorToast && (
            <div className="toast-notification">
              <div className="toast-notification__content">
                <span className="toast-notification__icon">⚠️</span>
                <p>{errorMessage}</p>
              </div>
              <button
                className="toast-notification__close"
                onClick={() => setShowErrorToast(false)}
              >
                ×
              </button>
            </div>
          )}

          {validationToast.show && (
            <div className="toast-notification">
              <div className="toast-notification__content">
                <span className="toast-notification__icon">❌</span>
                <p>{validationToast.message}</p>
              </div>
            </div>
          )}

          <div className="payment-modal-body">
            <div className="payment-plan-summary">
              <h3>{selectedPlan.name}</h3>
              <p className="payment-plan-price">
                R$ {selectedPlan.price.toFixed(2).replace('.', ',')}
                {isRecurringSubscription && <span className="recurring-badge"> /mês</span>}
              </p>
            </div>

            {isRecurringSubscription ? (
              <div className="recurring-subscription-content">
                <div className="recurring-info">
                  <h4>🔄 Assinatura Recorrente</h4>
                  <ul>
                    <li>✓ Cobrança automática mensal</li>
                    <li>✓ Cancele quando quiser</li>
                    <li>✓ Sem taxas de cancelamento</li>
                    <li>✓ Processamento seguro pelo Mercado Pago</li>
                  </ul>
                </div>

                <div className="payment-terms-section">
                  <div className="payment-terms-box">
                    <h4>📄 Termos de Contratação</h4>
                    <p>Leia atentamente nossos termos de contratação antes de prosseguir.</p>
                    {termsDocUrl && (
                      <a
                        href={termsDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="payment-terms-download"
                      >
                        📥 Baixar Termos
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
                      Li e aceito os termos de contratação e autorizo a cobrança recorrente mensal
                    </span>
                  </label>
                </div>

                <div className="payment-modal-footer">
                  <button type="button" onClick={onClose}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRecurringSubscription}
                    disabled={!acceptedTerms}
                    className="recurring-button"
                  >
                    Prosseguir para Pagamento
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="payment-methods">
                  {availableMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`payment-method-btn ${paymentMethod === method ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method === 'pix' ? 'PIX' : method === 'credit' ? 'Crédito' : 'Débito'}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'pix' ? (
                  <form onSubmit={handlePixSubmit}>
                    <div className="pix-payment-section">
                      <div className="pix-qrcode">
                        <div className="pix-qrcode-placeholder">
                          <p>QR CODE PIX</p>
                        </div>
                        {!pixExpired ? (
                          <div className="pix-timer">⏱️ Expira em: {formatTime(pixTimer)}</div>
                        ) : (
                          <div className="pix-expired">❌ QR Code expirado</div>
                        )}
                      </div>

                      {pixKey && (
                        <div className="pix-key-section">
                          <h4>Chave PIX</h4>
                          <div className="pix-key-container">
                            <input type="text" value={pixKey} readOnly className="pix-key-input" />
                            <button
                              type="button"
                              className={`pix-copy-btn ${pixKeyCopied ? 'copied' : ''}`}
                              onClick={handleCopyPixKey}
                            >
                              {pixKeyCopied ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pix-instructions">
                        <h4>Como pagar:</h4>
                        <ol>
                          <li>Abra o app do seu banco</li>
                          <li>Escaneie o QR Code ou copie a chave PIX</li>
                          <li>Confirme o pagamento</li>
                          <li>Aguarde a confirmação</li>
                        </ol>
                      </div>
                    </div>

                    <div className="payment-modal-footer">
                      <button type="button" onClick={onClose}>
                        Cancelar
                      </button>
                      <button type="submit" disabled={processing || pixExpired}>
                        {processing ? 'Processando...' : 'Confirmar Pagamento'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div id="cardPaymentBrick_container"></div>

                    {!isAppointmentPayment && (
                      <div className="payment-terms-section">
                        <div className="payment-terms-box">
                          <h4>📄 Termos de Contratação</h4>
                          <p>
                            Leia atentamente nossos termos de contratação antes de prosseguir com o
                            pagamento.
                          </p>
                          {termsDocUrl && (
                            <a
                              href={termsDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="payment-terms-download"
                            >
                              📥 Baixar Termos
                            </a>
                          )}
                        </div>

                        <label className="payment-terms-checkbox">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                          />
                          <span>Li e aceito os termos de contratação</span>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {processing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="processing-spinner-large"></div>
            <h2>Processando Pagamento</h2>
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
          userId={currentUser.id}
          onSelectCard={(card) => console.log('Card selected:', card)}
        />
      )}
    </>
  );
}
