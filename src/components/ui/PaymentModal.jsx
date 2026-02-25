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
import { getTermsDocument } from '../../services/termsService';
import {
  processMercadoPagoPayment,
  processMercadoPagoPaymentPix,
  checkPixStatus,
} from '../../services/mercadoPagoService';
import './PaymentModal.css';

const SUBSCRIPTION_LINKS = {
  150: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=248f6838b5a0470c96b23a4edd1905d8',
  1: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=6a4820f29af0439eaedd4ffa13a0acbf',
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
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [showSavedCards, setShowSavedCards] = useState(false);
  const [hasCards, setHasCards] = useState(false);
  const [pixTimer, setPixTimer] = useState(600);
  const [pixExpired, setPixExpired] = useState(false);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixPaymentId, setPixPaymentId] = useState(null);
  const [pixQrCopied, setPixQrCopied] = useState(false);
  const [pixGenerating, setPixGenerating] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationToast, setValidationToast] = useState({ show: false, message: '' });
  const [termsDocUrl, setTermsDocUrl] = useState('');
  const [mercadoPagoInstance, setMercadoPagoInstance] = useState(null);
  const [brickController, setBrickController] = useState(null);
  const [brickLoaded, setBrickLoaded] = useState(false);
  const [pixApproved, setPixApproved] = useState(false);

  const cardPaymentBrickRef = useRef(null);
  const isRenderingBrick = useRef(false);
  const pixPollingRef = useRef(null);
  const pixPaymentIdRef = useRef(null);

  // const MERCADO_PAGO_PUBLIC_KEY = 'TEST-e60cf7cf-2a92-4f82-bfec-978eaa9139f8';
  const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-3c24dcad-27ac-4f14-996c-d0ef917404b0';
  const isRecurringSubscription = !isAppointmentPayment && selectedPlan?.isRecurring;

  const getAvailablePaymentMethods = () => {
    if (isAppointmentPayment) return ['pix', 'credit', 'debit'];
    return ['credit'];
  };

  const availableMethods = getAvailablePaymentMethods();

  const getFinalPrice = () => {
    if (isAppointmentPayment) return selectedPlan.price;
    if (paymentMethod === 'credit') return selectedPlan.price * 1.05;
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
        const mp = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, { locale: 'pt-BR' });
        setMercadoPagoInstance(mp);
      };
      document.body.appendChild(script);
      return () => { if (script.parentNode) document.body.removeChild(script); };
    } else if (!isRecurringSubscription && window.MercadoPago && !mercadoPagoInstance) {
      const mp = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, { locale: 'pt-BR' });
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
      !isRenderingBrick.current &&
      !paymentStatus
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
  }, [mercadoPagoInstance, paymentMethod, isOpen, brickLoaded, isRecurringSubscription, paymentStatus]);

  useEffect(() => {
    if (paymentMethod === 'pix' && brickController) {
      brickController.unmount();
      setBrickController(null);
      setBrickLoaded(false);
    }
    if (paymentMethod !== 'pix' && pixPollingRef.current) {
      clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (isOpen && paymentMethod === 'pix') {
      setPixQrCodeBase64('');
      setPixQrCode('');
      setPixPaymentId(null);
      pixPaymentIdRef.current = null;
      setPixTimer(600);
      setPixExpired(false);
      setPixApproved(false);
      gerarPixPayment();
    }
  }, [isOpen, paymentMethod]);

  useEffect(() => {
    if (pixPollingRef.current) {
      clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }

    if (isOpen && paymentMethod === 'pix' && pixQrCodeBase64 && !pixExpired && pixPaymentId) {
      pixPollingRef.current = setInterval(() => {
        if (pixPaymentIdRef.current) {
          verificarStatusPix(pixPaymentIdRef.current);
        }
      }, 10000);
    }

    return () => {
      if (pixPollingRef.current) {
        clearInterval(pixPollingRef.current);
        pixPollingRef.current = null;
      }
    };
  }, [isOpen, paymentMethod, pixQrCodeBase64, pixExpired, pixPaymentId]);

  useEffect(() => {
    let interval;
    if (isOpen && paymentMethod === 'pix' && pixQrCodeBase64 && !pixExpired) {
      interval = setInterval(() => {
        setPixTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (pixPollingRef.current) {
              clearInterval(pixPollingRef.current);
              pixPollingRef.current = null;
            }
            setPixExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isOpen, paymentMethod, pixQrCodeBase64, pixExpired]);

  useEffect(() => {
    setShowErrorToast(false);
    setErrorMessage('');
  }, [paymentMethod]);

  useEffect(() => {
    setPaymentStatus(null);
  }, [paymentMethod]);

  useEffect(() => {
    if (isOpen && currentUser?.id && !isRecurringSubscription) checkUserCards();
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
    if (isOpen) loadTermsDoc();
  }, [isOpen]);

  const gerarPixPayment = async () => {
    setPixGenerating(true);
    setShowErrorToast(false);
    try {
      const pixPayload = {
        transaction_amount: getFinalPrice(),
        payment_method_id: 'pix',
        payer: { email: currentUser.email },
        description: isAppointmentPayment
          ? `Pagamento - ${selectedPlan.serviceName || selectedPlan.name || 'Serviço'}`
          : `Assinatura - ${selectedPlan.name}`,
      };

      const result = await processMercadoPagoPaymentPix(pixPayload);

      setPixQrCodeBase64(result?.qr_code_base64 || '');
      setPixQrCode(result?.qr_code || '');
      setPixPaymentId(result.id);
      pixPaymentIdRef.current = result.id;
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      setErrorMessage('Erro ao gerar QR Code PIX. Tente novamente.');
      setShowErrorToast(true);
    } finally {
      setPixGenerating(false);
    }
  };

  const verificarStatusPix = async (idPix) => {
    try {
      const result = await checkPixStatus(idPix);

      if (isAppointmentPayment && result === 'approved') {
        if (selectedPlan.needsCreation && selectedPlan.appointmentData && selectedPlan.paymentData) {
          clearInterval(pixPollingRef.current);
          pixPollingRef.current = null;
          setPixApproved(true);

          const paymentMethodString = 'pix';
          const finalAmount = getFinalPrice();

          const appointmentResponse = await fetch(`http://localhost:3000/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedPlan.appointmentData),
          });
          if (!appointmentResponse.ok) throw new Error('Erro ao criar agendamento');
          const createdAppointment = await appointmentResponse.json();

          await criarPagamentoAgendamento({
            ...selectedPlan.paymentData,
            appointmentId: createdAppointment.id,
            status: 'paid',
            paymentMethod: paymentMethodString,
            paidAt: new Date().toISOString(),
            amount: finalAmount,
            mercadoPagoId: idPix,
            cardData: {
              brand: undefined,
              lastDigits: '****',
            },
          });

          onSuccess && onSuccess(paymentMethodString);
          setProcessing(false);
          onClose();

        } else if (paymentId) {
          const paymentMethodString = 'pix';
          const finalAmount = getFinalPrice();

          await atualizarPagamentoAgendamento(paymentId, {
            status: 'paid',
            paymentMethod: paymentMethodString,
            paidAt: new Date().toISOString(),
            amount: finalAmount,
            mercadoPagoId: idPix,
            cardData: {
              brand: undefined,
              lastDigits: '****',
            },
          });

          onSuccess && onSuccess(paymentMethodString);
          setProcessing(false);
          onClose();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status PIX:', error);
      setErrorMessage('Erro ao confirmar pagamento PIX. Tente novamente.');
      setShowErrorToast(true);
      setProcessing(false);
    }
  };

  const handlePixSubmit = async (e) => {
    e.preventDefault();
    if (pixExpired || !pixPaymentId) return;
    await verificarStatusPix(pixPaymentId);
  };

  const renderCardPaymentBrick = async () => {
    if (isRenderingBrick.current) return;
    isRenderingBrick.current = true;
    try {
      if (brickController) {
        await brickController.unmount();
        setBrickController(null);
      }
      const container = document.getElementById('cardPaymentBrick_container');
      if (container) container.innerHTML = '';

      const bricksBuilder = mercadoPagoInstance.bricks();
      const controller = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
        initialization: { amount: getFinalPrice() },
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
            setBrickLoaded(true);
            isRenderingBrick.current = false;
          },
          onSubmit: async (cardFormData) => handleMercadoPagoSubmit(cardFormData),
          onError: (error) => {
            console.error('Erro no Card Payment Brick:', error);
            setErrorMessage('Erro ao processar pagamento. Verifique os dados do cartão.');
            setShowErrorToast(true);
            isRenderingBrick.current = false;
          },
        },
      });

      setBrickController(controller);
    } catch (error) {
      console.error('Erro ao renderizar Card Payment Brick:', error);
      setErrorMessage('Erro ao carregar formulário de pagamento. Tente novamente.');
      setShowErrorToast(true);
      isRenderingBrick.current = false;
    }
  };

  const handleResetPayment = () => {
    setPaymentStatus(null);
    setShowErrorToast(false);
    setErrorMessage('');
    setBrickLoaded(false);
    setBrickController(null);
  };

  const handleMercadoPagoSubmit = async (cardFormData) => {
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
          email: cardFormData.payer.email,
          identification: {
            type: cardFormData.payer.identification.type,
            number: cardFormData.payer.identification.number,
          },
        },
        description: isAppointmentPayment
          ? `Pagamento - ${selectedPlan.serviceName || selectedPlan.name || 'Serviço'}`
          : `Assinatura - ${selectedPlan.name}`,
      };

      const paymentResult = await processMercadoPagoPayment(paymentData);

      if (paymentResult.status === 'approved' || paymentResult.status === 'authorized') {
        const finalAmount = getFinalPrice();
        const paymentMethodString = paymentMethod === 'credit' ? 'credito' : 'debito';

        if (isAppointmentPayment) {
          if (selectedPlan.needsCreation && selectedPlan.appointmentData && selectedPlan.paymentData) {
            const appointmentResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/appointments`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedPlan.appointmentData),
              }
            );
            if (!appointmentResponse.ok) throw new Error('Erro ao criar agendamento');
            const createdAppointment = await appointmentResponse.json();

            await criarPagamentoAgendamento({
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
            });
          } else if (paymentId) {
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
          }
          onSuccess && onSuccess(paymentMethodString);
        } else {
          const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
          await criarPagamentoAgendamento({
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
          });

          const subscription = await criarAssinatura({
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
          });

          try {
            await enviarNotificacaoAssinatura(subscription);
          } catch (error) {
            console.error('Erro ao enviar notificação (não crítico):', error);
          }

          onSuccess && onSuccess(subscription);
        }

        setProcessing(false);
        onClose();
        return { status: 'success' };

      } else if (paymentResult.status === 'rejected') {
        setPaymentStatus('rejected');
        setProcessing(false);
        return new Promise((_, reject) => reject(new Error('Payment rejected')));

      } else {

        setPaymentStatus('pending');
        setErrorMessage(
          `Pagamento em análise (status: ${paymentResult.status}). Você receberá uma confirmação em breve.`
        );
        setShowErrorToast(true);
        setProcessing(false);
        return { status: paymentResult.status };
      }

    } catch (error) {
      setErrorMessage(error.message || 'Erro ao processar pagamento. Tente novamente.');
      setShowErrorToast(true);
      setProcessing(false);
      return new Promise((_, reject) => reject(error));
    }
  };

  const handleCopyPixKey = () => {
    if (pixQrCode) {
      navigator.clipboard.writeText(pixQrCode);
      setPixQrCopied(true);
      setTimeout(() => setPixQrCopied(false), 3000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadTerms = async (e) => {
    e.preventDefault();
    if (!termsDocUrl) return;
    try {
      const response = await fetch(termsDocUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'termos-contratacao.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Erro ao baixar documento de termos:', error);
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
    window.open(subscriptionLink, '_blank');
  };

  const checkUserCards = async () => {
    try {
      const cards = await getUserCards(currentUser.id);
      setHasCards(cards.length > 0);
    } catch {
      setHasCards(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={onClose}>×</button>

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
              <button className="toast-notification__close" onClick={() => setShowErrorToast(false)}>×</button>
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

          {paymentStatus === 'in_process' && (
            <div className="payment-status-screen">
              <div className="payment-status-icon processing-icon">
                <div className="processing-spinner-large"></div>
              </div>
              <h2>Pagamento em Análise</h2>
              <p>Seu pagamento está sendo processado pela operadora. Você receberá uma confirmação em breve.</p>
              <button type="button" className="payment-status-btn" onClick={onClose}>
                Fechar
              </button>
            </div>
          )}

          {paymentStatus === 'rejected' && (
            <div className="payment-status-screen">
              <div className="payment-status-icon rejected-icon">
                <span>✕</span>
              </div>
              <h2>Pagamento Recusado</h2>
              <p>Verifique os dados do cartão ou tente outra forma de pagamento.</p>
              <div className="payment-status-actions">
                <button type="button" className="payment-status-btn retry" onClick={handleResetPayment}>
                  Tentar Novamente
                </button>
                <button type="button" className="payment-status-btn cancel" onClick={onClose}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!paymentStatus && (
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
                        <a href={termsDocUrl} onClick={handleDownloadTerms} className="payment-terms-download">
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
                      <span>Li e aceito os termos de contratação e autorizo a cobrança recorrente mensal</span>
                    </label>
                  </div>

                  <div className="payment-modal-footer">
                    <button type="button" onClick={onClose}>Cancelar</button>
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
                        <div className="pix-qrcode-wrapper">
                          {pixGenerating ? (
                            <div className="pix-loading">
                              <div className="pix-spinner" />
                              <p>Gerando QR Code...</p>
                            </div>
                          ) : pixQrCodeBase64 ? (
                            <>
                              <img
                                className="pix-qrcode-img"
                                width="220"
                                src={`data:image/png;base64,${pixQrCodeBase64}`}
                                alt="QR Code PIX"
                              />
                              {!pixExpired ? (
                                <div className="pix-timer">
                                  ⏱ Expira em: <strong>{formatTime(pixTimer)}</strong>
                                </div>
                              ) : (
                                <div className="pix-expired">
                                  <span>❌ QR Code expirado</span>
                                  <button
                                    type="button"
                                    className="pix-retry-btn"
                                    onClick={() => {
                                      setPixExpired(false);
                                      setPixTimer(600);
                                      setPixQrCodeBase64('');
                                      setPixQrCode('');
                                      setPixPaymentId(null);
                                      pixPaymentIdRef.current = null;
                                      setPixApproved(false);
                                      gerarPixPayment();
                                    }}
                                  >
                                    🔄 Gerar novo QR Code
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="pix-error-state">
                              <p>Não foi possível gerar o QR Code.</p>
                              <button type="button" className="pix-retry-btn" onClick={gerarPixPayment}>
                                Tentar novamente
                              </button>
                            </div>
                          )}
                        </div>

                        {pixQrCode && (
                          <div className="pix-copy-section">
                            <p className="pix-copy-label">📋 Pix Copia e Cola</p>
                            <div className="pix-copy-box">
                              <span className="pix-copy-value">{pixQrCode}</span>
                              <button
                                type="button"
                                className={`pix-copy-btn ${pixQrCopied ? 'copied' : ''}`}
                                onClick={handleCopyPixKey}
                                disabled={pixExpired}
                              >
                                {pixQrCopied ? '✓ Copiado!' : 'Copiar'}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="pix-instructions">
                          <h4>Como pagar:</h4>
                          <ol>
                            <li>Abra o app do seu banco</li>
                            <li>Escaneie o QR Code ou copie a chave Pix acima</li>
                            <li>Confirme o pagamento no banco</li>
                            <li>Clique em <strong>"Confirmar Pagamento"</strong> abaixo</li>
                          </ol>
                        </div>
                      </div>

                      <div className="payment-modal-footer">
                        <button type="button" onClick={onClose}>Cancelar</button>
                        <button
                          type="submit"
                          disabled={processing || pixExpired || pixGenerating || !pixPaymentId}
                        >
                          {processing ? 'Verificando...' : 'Confirmar Pagamento'}
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
                            <p>Leia atentamente nossos termos de contratação antes de prosseguir com o pagamento.</p>
                            {termsDocUrl && (
                              <a href={termsDocUrl} onClick={handleDownloadTerms} className="payment-terms-download">
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
          )}
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