import { useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  criarPagamentoAgendamento,
  atualizarPagamentoAgendamento,
} from '../../services/paymentService';
import { processMercadoPagoPaymentPix, checkPixStatus } from '../../services/mercadoPagoService';
import { createAppointment, deleteAppointment } from '../../services/appointmentService';
import { getTermsDocument } from '../../services/termsService';
import { createStripePaymentIntent } from '../../services/stripeService';
import './PaymentModal.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function StripePaymentForm({
  isOpen,
  onClose,
  selectedPlan,
  currentUser,
  onSuccess,
  isAppointmentPayment = false,
  paymentId = null,
  clientSecret,
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationToast, setValidationToast] = useState({ show: false, message: '' });
  const [termsDocUrl, setTermsDocUrl] = useState('');
  const [selectedStripeMethod, setSelectedStripeMethod] = useState('card');
  const pixPollingRef = useRef(null);
  const stripePixEnabled = String(import.meta.env.VITE_STRIPE_PIX_ENABLED || '').toLowerCase() === 'true';

  const normalizePaymentMethod = () => {
    if (!stripePixEnabled) return 'card';
    return selectedStripeMethod === 'pix' ? 'pix' : 'card';
  };

  // 🔴 ROLLBACK: Deletar agendamento se pagamento falhar
  const rollbackAppointment = async (appointmentId) => {
    if (!appointmentId) return;
    try {
      await deleteAppointment(appointmentId);
    } catch (error) {
      console.error('⚠️ Erro ao remover agendamento:', error);
      // Não falhar por isso, o usuário já sabe que o pagamento falhou
    }
  };

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
    return () => {
      if (pixPollingRef.current) {
        clearInterval(pixPollingRef.current);
        pixPollingRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!stripePixEnabled && selectedStripeMethod !== 'card') {
      setSelectedStripeMethod('card');
    }
  }, [stripePixEnabled, selectedStripeMethod]);

  useEffect(() => {
    return () => {
      if (pixPollingRef.current) {
        clearInterval(pixPollingRef.current);
        pixPollingRef.current = null;
      }
    };
  }, []);

  const getFinalPrice = () => Number(selectedPlan?.price || 0);

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

  const handleClose = () => {
    if (pixPollingRef.current) {
      clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
    setShowErrorToast(false);
    setErrorMessage('');
    setPaymentStatus(null);
    onClose();
  };

  const persistSuccessfulPayment = async (paymentIntent) => {
    const stripeIntentAmount = Number(paymentIntent?.amount_received ?? paymentIntent?.amount);
    const finalAmount = Number.isFinite(stripeIntentAmount) && stripeIntentAmount > 0
      ? stripeIntentAmount / 100
      : getFinalPrice();
    const paymentMethod = normalizePaymentMethod();

    if (isAppointmentPayment) {
      // ✅ NOVO: Agendamento já foi criado no AppointmentsPage.jsx
      // Apenas atualizar o pagamento com status 'paid'
      if (selectedPlan?.paymentId) {
        // 🔥 NOVO: Usar paymentId para atualizar o pagamento existente
        await atualizarPagamentoAgendamento(selectedPlan.paymentId, {
          status: 'paid',
          paymentMethod,
          paidAt: new Date().toISOString(),
          amount: finalAmount,
          paymentProvider: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
          stripeStatus: paymentIntent.status,
          cardData: {
            brand: '',
            lastDigits: '****',
          },
        });
      } else if (selectedPlan?.appointmentId) {
        // Fallback: se por algum motivo não temos paymentId, criar novo registro de pagamento
        await criarPagamentoAgendamento({
          ...selectedPlan.paymentData,
          appointmentId: selectedPlan.appointmentId,
          status: 'paid',
          paymentMethod,
          paidAt: new Date().toISOString(),
          amount: finalAmount,
          paymentProvider: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
          stripeStatus: paymentIntent.status,
          cardData: {
            brand: '',
            lastDigits: '****',
          },
        });
      } else if (selectedPlan?.needsCreation && selectedPlan?.appointmentData && selectedPlan?.paymentData) {
        // Fallback para código antigo (if necessário)
        const createdAppointment = await createAppointment(selectedPlan.appointmentData);
        await criarPagamentoAgendamento({
          ...selectedPlan.paymentData,
          appointmentId: createdAppointment.id,
          status: 'paid',
          paymentMethod,
          paidAt: new Date().toISOString(),
          amount: finalAmount,
          paymentProvider: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
          stripeStatus: paymentIntent.status,
          cardData: {
            brand: '',
            lastDigits: '****',
          },
        });
      } else if (paymentId) {
        await atualizarPagamentoAgendamento(paymentId, {
          status: 'paid',
          paymentMethod,
          paidAt: new Date().toISOString(),
          amount: finalAmount,
          paymentProvider: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
          stripeStatus: paymentIntent.status,
          cardData: {
            brand: '',
            lastDigits: '****',
          },
        });
      }

      onSuccess && onSuccess('card');
      onSuccess && onSuccess(paymentMethod);
      return;
    }

    try {
      await criarPagamentoAgendamento({
        userId: currentUser?.id,
        userName: currentUser?.name,
        planId: selectedPlan?.id,
        planName: selectedPlan?.name,
        amount: finalAmount,
        paymentMethod,
        status: 'approved',
        type: 'one_time',
        transactionId: paymentIntent.id,
        paymentProvider: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        stripeStatus: paymentIntent.status,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        cardData: {
          brand: '',
          lastDigits: '****',
        },
      });
    } catch (error) {
      console.error('Erro ao salvar pagamento avulso:', error);
    }

    onSuccess && onSuccess(paymentIntent);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAppointmentPayment && !acceptedTerms) {
      setValidationToast({
        show: true,
        message: 'Você precisa aceitar os termos de contratação',
      });
      setTimeout(() => setValidationToast({ show: false, message: '' }), 4000);
      return;
    }

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);
    setShowErrorToast(false);
    setErrorMessage('');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: currentUser?.name || '',
              email: currentUser?.email || '',
            },
          },
          receipt_email: currentUser?.email || undefined,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Erro ao processar pagamento.');
        setShowErrorToast(true);
        setProcessing(false);
        return;
      }

      const result = await stripe.retrievePaymentIntent(clientSecret);
      const paymentIntent = result.paymentIntent;

      if (!paymentIntent) {
        throw new Error('Não foi possível confirmar o status do pagamento.');
      }

      if (paymentIntent.status === 'succeeded') {
        await persistSuccessfulPayment(paymentIntent);
        setProcessing(false);
        onClose();
        return;
      }

      if (paymentIntent.status === 'processing') {
        setPaymentStatus('processing');
        setErrorMessage(
          normalizePaymentMethod() === 'pix'
            ? 'PIX gerado. Aguardando confirmação do pagamento.'
            : 'Pagamento em processamento. Aguarde a confirmação.'
        );
        setShowErrorToast(true);

        if (normalizePaymentMethod() === 'pix') {
          if (pixPollingRef.current) {
            clearInterval(pixPollingRef.current);
            pixPollingRef.current = null;
          }

          pixPollingRef.current = setInterval(async () => {
            try {
              const latest = await stripe.retrievePaymentIntent(clientSecret);
              const latestIntent = latest.paymentIntent;

              if (!latestIntent) return;

              if (latestIntent.status === 'succeeded') {
                clearInterval(pixPollingRef.current);
                pixPollingRef.current = null;
                await persistSuccessfulPayment(latestIntent);
                setProcessing(false);
                onClose();
                return;
              }

              if (latestIntent.status === 'canceled' || latestIntent.status === 'requires_payment_method') {
                clearInterval(pixPollingRef.current);
                pixPollingRef.current = null;
                // ❌ PIX não foi concluído - fazer rollback do agendamento
                await rollbackAppointment(selectedPlan?.appointmentId);
                setPaymentStatus('rejected');
                setErrorMessage('Pagamento PIX não foi concluído. Tente novamente.');
                setShowErrorToast(true);
              }
            } catch (pollError) {
              console.error('Erro ao consultar status do PIX Stripe:', pollError);
            }
          }, 3000);
        }

        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'requires_payment_method') {
        // ❌ Pagamento recusado - fazer rollback do agendamento
        await rollbackAppointment(selectedPlan?.appointmentId);
        setPaymentStatus('rejected');
        setErrorMessage('Pagamento recusado. Verifique os dados do cartão.');
        setShowErrorToast(true);
        setProcessing(false);
        return;
      }

      setPaymentStatus(paymentIntent.status);
      setErrorMessage(`Status do pagamento: ${paymentIntent.status}`);
      setShowErrorToast(true);
      setProcessing(false);
    } catch (error) {
      console.error('Erro ao confirmar pagamento Stripe:', error);
      // ❌ Erro ao processar pagamento - fazer rollback do agendamento
      await rollbackAppointment(selectedPlan?.appointmentId);
      setErrorMessage(error.message || 'Erro ao processar pagamento. Tente novamente.');
      setShowErrorToast(true);
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="payment-modal-overlay" onClick={handleClose}>
        <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={handleClose}>×</button>

          <div className="payment-modal-header">
            <h2>
              {paymentStatus === 'rejected'
                ? 'Pagamento Recusado'
                : paymentStatus === 'processing'
                  ? 'Pagamento em Processamento'
                  : isAppointmentPayment
                    ? 'Finalizar pagamento do agendamento'
                    : 'Complete os dados para finalizar seu pagamento'}
            </h2>

            <p className="payment-modal-subtitle">
              {isAppointmentPayment
                ? 'Pagamento do seu agendamento'
                : `Pagamento de ${selectedPlan?.name || 'Serviço'}`}
            </p>
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

          {paymentStatus === 'rejected' ? (
            <div className="payment-status-screen">
              <div className="payment-status-icon rejected-icon"><span>✕</span></div>
              <h2>Pagamento Recusado</h2>
              <p>Verifique os dados do cartão ou tente novamente.</p>
              <div className="payment-status-actions">
                <button
                  type="button"
                  className="payment-status-btn retry"
                  onClick={() => {
                    setPaymentStatus(null);
                    setShowErrorToast(false);
                    setErrorMessage('');
                  }}
                >
                  Tentar Novamente
                </button>
                <button
                  type="button"
                  className="payment-status-btn cancel"
                  onClick={handleClose}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="payment-modal-body">
                <div className="payment-plan-summary">
                  <h3>{selectedPlan?.name}</h3>
                  <p className="payment-plan-price">
                    R$ {Number(selectedPlan?.price || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>

                <div className="payment-methods">
                  {/* <button
                    type="button"
                    className={`payment-method-btn ${selectedStripeMethod === 'card' ? 'active' : ''}`}
                  >
                    Cartão
                  </button> */}
                  {/* {stripePixEnabled ? (
                    <button
                      type="button"
                      className={`payment-method-btn ${selectedStripeMethod === 'pix' ? 'active' : ''}`}
                    >
                      Pix
                    </button>
                  ) : (
                    <span className="payment-method-hint">Pix indisponível nesta conta Stripe</span>
                  )} */}
                </div>

                <div style={{ marginTop: 16 }}>
                  <PaymentElement
                    options={{
                      layout: 'tabs',
                    }}
                    onChange={(event) => {
                      const selectedType = event?.value?.type;
                      if (selectedType) {
                        setSelectedStripeMethod(selectedType);
                      }
                    }}
                  />
                </div>

                {!isAppointmentPayment && (
                  <div className="payment-terms-section">
                    <div className="payment-terms-box">
                      <h4>📄 Termos de Contratação</h4>
                      <p>Leia atentamente nossos termos de contratação antes de prosseguir com o pagamento.</p>
                      {termsDocUrl && (
                        <a
                          href={termsDocUrl}
                          onClick={handleDownloadTerms}
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

                <div className="payment-modal-footer">
                  <button type="button" onClick={handleClose}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={!stripe || !elements || processing}>
                    {processing ? 'Processando...' : 'Pagar'}
                  </button>
                </div>
              </div>
            </form>
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
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MercadoPagoPixForm({
  isOpen,
  onClose,
  selectedPlan,
  currentUser,
  onSuccess,
  paymentId = null,
}) {
  const [processing, setProcessing] = useState(false);
  const [pixGenerating, setPixGenerating] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixPaymentId, setPixPaymentId] = useState(null);
  const [pixQrCopied, setPixQrCopied] = useState(false);

  const pixPollingRef = useRef(null);

  const finalAmount = Number(selectedPlan?.price || selectedPlan?.paymentData?.amount || 0);

  const clearPixPolling = () => {
    if (pixPollingRef.current) {
      clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPixPolling();
    };
  }, []);

  const handleCopyPixKey = () => {
    if (!pixQrCode) return;
    navigator.clipboard.writeText(pixQrCode);
    setPixQrCopied(true);
    setTimeout(() => setPixQrCopied(false), 2500);
  };

  const persistPixApprovedPayment = async (mercadoPagoId) => {


    if (selectedPlan?.paymentId) {
      // 🔥 NOVO: Usar paymentId para atualizar o pagamento existente
      await atualizarPagamentoAgendamento(selectedPlan.paymentId, {
        status: 'paid',
        paymentMethod: 'pix',
        paidAt: new Date().toISOString(),
        amount: finalAmount,
        paymentProvider: 'mercadopago',
        mercadoPagoId,
        mercadoPagoStatus: 'approved',
      });
      return;
    }

    if (selectedPlan?.appointmentId) {
      await criarPagamentoAgendamento({
        ...selectedPlan.paymentData,
        appointmentId: selectedPlan.appointmentId,
        status: 'paid',
        paymentMethod: 'pix',
        paidAt: new Date().toISOString(),
        amount: finalAmount,
        paymentProvider: 'mercadopago',
        mercadoPagoId,
        mercadoPagoStatus: 'approved',
      });
      return;
    }

    if (selectedPlan?.needsCreation && selectedPlan?.appointmentData && selectedPlan?.paymentData) {
      const createdAppointment = await createAppointment(selectedPlan.appointmentData);
      await criarPagamentoAgendamento({
        ...selectedPlan.paymentData,
        appointmentId: createdAppointment.id,
        status: 'paid',
        paymentMethod: 'pix',
        paidAt: new Date().toISOString(),
        amount: finalAmount,
        paymentProvider: 'mercadopago',
        mercadoPagoId,
        mercadoPagoStatus: 'approved',
      });
      return;
    }

    if (paymentId) {
      await atualizarPagamentoAgendamento(paymentId, {
        status: 'paid',
        paymentMethod: 'pix',
        paidAt: new Date().toISOString(),
        amount: finalAmount,
        paymentProvider: 'mercadopago',
        mercadoPagoId,
        mercadoPagoStatus: 'approved',
      });
    }
  };

  const pollPixStatus = (mpPaymentId) => {
    clearPixPolling();
    pixPollingRef.current = setInterval(async () => {
      try {
        const status = String(await checkPixStatus(mpPaymentId)).toLowerCase();

        if (status === 'approved') {
          clearPixPolling();
          setProcessing(true);
          await persistPixApprovedPayment(mpPaymentId);
          setProcessing(false);
          onSuccess && onSuccess('pix');
          onClose();
          return;
        }

        if (status === 'cancelled' || status === 'rejected') {
          clearPixPolling();
          setErrorMessage('Pagamento PIX foi cancelado/recusado. Gere um novo QR Code para tentar novamente.');
          setShowErrorToast(true);
        }
      } catch (error) {
        console.error('Erro ao verificar status PIX Mercado Pago:', error);
        clearPixPolling();
        setProcessing(false);
        setErrorMessage(error.message || 'Erro ao finalizar agendamento. Tente novamente.');
        setShowErrorToast(true);
      }
    }, 3000);
  };

  const handleGeneratePix = async () => {
    if (!currentUser?.email) {
      setErrorMessage('Não foi possível identificar o e-mail do pagador para gerar o PIX.');
      setShowErrorToast(true);
      return;
    }

    setPixGenerating(true);
    setShowErrorToast(false);
    setErrorMessage('');

    try {
      const payload = {
        transaction_amount: finalAmount,
        payment_method_id: 'pix',
        payer: {
          email: currentUser.email,
        },
        description: selectedPlan?.serviceName
          ? `Pagamento - ${selectedPlan.serviceName}`
          : `Pagamento - ${selectedPlan?.name || 'Agendamento'}`,
      };

      const result = await processMercadoPagoPaymentPix(payload);
      const mpId = result?.id;

      if (!mpId || !result?.qr_code) {
        throw new Error('Não foi possível gerar o QR Code PIX.');
      }

      setPixPaymentId(mpId);
      setPixQrCode(result.qr_code);
      setPixQrCodeBase64(result.qr_code_base64 || '');
      pollPixStatus(mpId);
    } catch (error) {
      setErrorMessage(error.message || 'Erro ao gerar PIX via Mercado Pago.');
      setShowErrorToast(true);
    } finally {
      setPixGenerating(false);
    }
  };

  const handleClose = () => {
    clearPixPolling();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="payment-modal-overlay" onClick={handleClose}>
        <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={handleClose}>×</button>

          <div className="payment-modal-header">
            <h2>Pagamento via Pix</h2>
            <p className="payment-modal-subtitle">Pix Mercado Pago para concluir seu agendamento</p>
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

          <div className="payment-modal-body">
            <div className="payment-plan-summary">
              <h3>{selectedPlan?.name || 'Agendamento'}</h3>
              <p className="payment-plan-price">
                R$ {finalAmount.toFixed(2).replace('.', ',')}
              </p>
            </div>

            {!pixPaymentId && (
              <div className="payment-modal-footer">
                <button type="button" onClick={handleClose}>Cancelar</button>
                <button type="button" onClick={handleGeneratePix} disabled={pixGenerating || processing}>
                  {pixGenerating ? 'Gerando...' : 'Gerar QR Code Pix'}
                </button>
              </div>
            )}

            {pixPaymentId && (
              <div style={{ marginTop: 16 }}>
                {pixQrCodeBase64 ? (
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <img
                      src={`data:image/png;base64,${pixQrCodeBase64}`}
                      alt="QR Code Pix"
                      style={{
                        width: 280,
                        maxWidth: '100%',
                        borderRadius: 14,
                        background: '#fff',
                        padding: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
                      }}
                    />
                  </div>
                ) : null}

                <p
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '0.85rem',
                    color: '#d0d0d0',
                    fontWeight: 600,
                  }}
                >
                  Pix copia e cola
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    background: '#121212',
                    border: '1px solid #343434',
                    borderRadius: 10,
                    padding: 8,
                  }}
                >
                  <input
                    type="text"
                    value={pixQrCode}
                    readOnly
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid #3f3f3f',
                      background: '#1b1b1b',
                      color: '#f2f2f2',
                      padding: '0 10px',
                      fontSize: '0.88rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyPixKey}
                    style={{
                      height: 40,
                      minWidth: 92,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: '1px solid #4a4a4a',
                      background: '#232323',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {pixQrCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <p
                  style={{
                    marginTop: 14,
                    fontSize: '1.02rem',
                    color: '#f3f3f3',
                    fontWeight: 600,
                    lineHeight: 1.45,
                    background: 'rgba(255, 122, 26, 0.1)',
                    border: '1px solid rgba(255, 122, 26, 0.35)',
                    borderRadius: 10,
                    padding: '10px 12px',
                  }}
                >
                  Aguardando confirmação do pagamento. Esta tela fecha automaticamente após aprovação.
                </p>

                <div className="payment-modal-footer">
                  <button type="button" onClick={handleClose}>Fechar</button>
                  <button type="button" onClick={handleGeneratePix} disabled={pixGenerating || processing}>
                    {pixGenerating ? 'Gerando...' : 'Gerar novo Pix'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {processing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="processing-spinner-large"></div>
            <h2>Confirmando pagamento</h2>
            <p>Aguarde enquanto validamos o Pix no Mercado Pago</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function PaymentModal({
  isOpen,
  onClose,
  selectedPlan,
  currentUser,
  onSuccess,
  isAppointmentPayment = false,
  paymentId = null,
}) {
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');
  const stripePixEnabled = String(import.meta.env.VITE_STRIPE_PIX_ENABLED || '').toLowerCase() === 'true';
  const preferredMethod = String(selectedPlan?.paymentMethod || selectedPlan?.method || '').toLowerCase();
  const isMercadoPagoPixFlow = isAppointmentPayment && preferredMethod === 'pix';

  useEffect(() => {
    let cancelled = false;

    const createIntent = async () => {
      if (!isOpen || !selectedPlan || !currentUser || isMercadoPagoPixFlow) return;

      setLoadingIntent(true);
      setIntentError('');
      setClientSecret('');

      try {
        const response = await createStripePaymentIntent({
          amount: Number(selectedPlan.price || 0),
          currency: 'brl',
          paymentMethodTypes: stripePixEnabled ? ['card', 'pix'] : ['card'],
          customerEmail: currentUser.email,
          metadata: {
            userId: String(currentUser.id || ''),
            planId: String(selectedPlan.id || ''),
            planName: String(selectedPlan.name || ''),
            isAppointmentPayment: String(Boolean(isAppointmentPayment)),
            paymentId: String(paymentId || ''),
            appointmentId: String(
              selectedPlan?.appointmentId || selectedPlan?.paymentData?.appointmentId || ''
            ),
            barbershopId: String(currentUser?.barbershopId || ''),
          },
        });

        if (!cancelled) {
          setClientSecret(response.clientSecret);
        }
      } catch (error) {
        console.error('Erro ao criar PaymentIntent:', error);
        if (!cancelled) {
          setIntentError(error.message || 'Erro ao iniciar pagamento.');
        }
      } finally {
        if (!cancelled) {
          setLoadingIntent(false);
        }
      }
    };

    createIntent();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    selectedPlan?.id,
    selectedPlan?.price,
    selectedPlan?.name,
    currentUser?.id,
    currentUser?.email,
    isAppointmentPayment,
    paymentId,
    isMercadoPagoPixFlow,
  ]);

  const elementsOptions = useMemo(() => {
    if (!clientSecret) return null;

    return {
      clientSecret,
      locale: 'pt-BR',
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#ff7a1a',
          colorBackground: '#1a1a1a',
          colorText: '#ffffff',
          colorDanger: '#df1b41',
          borderRadius: '12px',
        },
      },
    };
  }, [clientSecret]);

  if (!isOpen) return null;

  if (isMercadoPagoPixFlow) {
    return (
      <MercadoPagoPixForm
        isOpen={isOpen}
        onClose={onClose}
        selectedPlan={selectedPlan}
        currentUser={currentUser}
        onSuccess={onSuccess}
        paymentId={paymentId}
      />
    );
  }

  if (loadingIntent) {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={onClose}>×</button>
          <div className="payment-modal-body">
            <p>Preparando pagamento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (intentError) {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={onClose}>×</button>
          <div className="payment-modal-body">
            <p>{intentError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!elementsOptions) return null;

  return (
    <Elements key={clientSecret} stripe={stripePromise} options={elementsOptions}>
      <StripePaymentForm
        isOpen={isOpen}
        onClose={onClose}
        selectedPlan={selectedPlan}
        currentUser={currentUser}
        onSuccess={onSuccess}
        isAppointmentPayment={isAppointmentPayment}
        paymentId={paymentId}
        clientSecret={clientSecret}
      />
    </Elements>
  );
}

