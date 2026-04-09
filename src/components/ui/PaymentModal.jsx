// import { useState, useEffect, useRef } from 'react';
// import Button from './Button';
// import SavedCardsModal from './SavedCardsModal';
// import { getUserCards, saveCard } from '../../services/cardServices';
// import {
//   criarAssinatura,
//   criarPagamentoAgendamento,
//   atualizarPagamentoAgendamento,
//   enviarNotificacaoAssinatura,
// } from '../../services/paymentService';
// import { getTermsDocument } from '../../services/termsService';
// import {
//   processMercadoPagoPayment,
//   processMercadoPagoPaymentPix,
//   checkPixStatus,
// } from '../../services/mercadoPagoService';
// import './PaymentModal.css';
// import { getToken } from '../../services/authService';


// function PixQrModal({ pixQrCodeBase64, pixQrCode, pixTimer, pixExpired, pixQrCopied, pixGenerating, onCopy, onClose }) {
//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   return (
//     <div className="payment-modal-overlay pix-qr-overlay" onClick={onClose}>
//       <div className="payment-modal-content pix-qr-modal" onClick={(e) => e.stopPropagation()}>
//         <button className="payment-modal-close" onClick={onClose}>×</button>

//         <div className="payment-modal-header">
//           <h2>Pagamento via PIX</h2>
//           <p className="payment-modal-subtitle">Escaneie o QR Code ou copie a chave abaixo</p>
//         </div>

//         <div className="pix-payment-section">
//           <div className="pix-qrcode-wrapper">
//             {pixGenerating ? (
//               <div className="pix-loading">
//                 <div className="pix-spinner" />
//                 <p>Gerando QR Code...</p>
//               </div>
//             ) : pixExpired ? (

//               null
//             ) : pixQrCodeBase64 ? (
//               <>
//                 <img
//                   className="pix-qrcode-img"
//                   width="220"
//                   src={`data:image/png;base64,${pixQrCodeBase64}`}
//                   alt="QR Code PIX"
//                 />
//                 <div className="pix-timer">
//                   ⏱ Expira em: <strong>{formatTime(pixTimer)}</strong>
//                 </div>
//               </>
//             ) : (
//               <div className="pix-error-state">
//                 <p>Não foi possível gerar o QR Code.</p>
//               </div>
//             )}
//           </div>

//           {pixQrCode && !pixExpired && (
//             <div className="pix-copy-section">
//               <p className="pix-copy-label">📋 Pix Copia e Cola</p>
//               <div className="pix-copy-box">
//                 <span className="pix-copy-value">{pixQrCode}</span>
//                 <button
//                   type="button"
//                   className={`pix-copy-btn ${pixQrCopied ? 'copied' : ''}`}
//                   onClick={onCopy}
//                 >
//                   {pixQrCopied ? '✓ Copiado!' : 'Copiar'}
//                 </button>
//               </div>
//             </div>
//           )}

//           {!pixExpired && (
//             <div className="pix-instructions">
//               <h4>Como pagar:</h4>
//               <ol>
//                 <li>Abra o app do seu banco</li>
//                 <li>Escaneie o QR Code ou copie a chave Pix acima</li>
//                 <li>Confirme o pagamento no banco</li>
//                 <li>O modal fechará automaticamente após a confirmação</li>
//               </ol>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function PaymentModal({
//   isOpen,
//   onClose,
//   selectedPlan,
//   currentUser,
//   onSuccess,
//   onPixExpired,
//   isAppointmentPayment = false,
//   paymentId = null,
// }) {
//   const [paymentMethod, setPaymentMethod] = useState('credit');
//   const [processing, setProcessing] = useState(false);
//   const [paymentStatus, setPaymentStatus] = useState(null);
//   const [showSavedCards, setShowSavedCards] = useState(false);
//   const [hasCards, setHasCards] = useState(false);

//   const [showPixQrModal, setShowPixQrModal] = useState(false);
//   const [pixTimer, setPixTimer] = useState(600);
//   const [pixExpired, setPixExpired] = useState(false);
//   const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');
//   const [pixQrCode, setPixQrCode] = useState('');
//   const [pixPaymentId, setPixPaymentId] = useState(null);
//   const [pixQrCopied, setPixQrCopied] = useState(false);
//   const [pixGenerating, setPixGenerating] = useState(false);

//   const [showErrorToast, setShowErrorToast] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [acceptedTerms, setAcceptedTerms] = useState(false);
//   const [validationToast, setValidationToast] = useState({ show: false, message: '' });
//   const [termsDocUrl, setTermsDocUrl] = useState('');
//   const [mercadoPagoInstance, setMercadoPagoInstance] = useState(null);
//   const [brickController, setBrickController] = useState(null);
//   const [subscriptionLinks, setSubscriptionLinks] = useState([]);
//   const [brickLoaded, setBrickLoaded] = useState(false);

//   const cardPaymentBrickRef = useRef(null);
//   const isRenderingBrick = useRef(false);
//   const pixPollingRef = useRef(null);
//   const pixPaymentIdRef = useRef(null);

//   // const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-3c24dcad-27ac-4f14-996c-d0ef917404b0';
//   const MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-dbce4522-de83-4285-a68f-836743a56c64';
//   const isRecurringSubscription = !isAppointmentPayment && selectedPlan?.isRecurring;

//   const token = getToken();

//   useEffect(() => {
//     const loadSubscriptionLinks = async () => {
//       try {
//         const response = await fetch(
//           `${import.meta.env.VITE_API_URL}/subscription-plans`,
//           {
//             method: 'GET',
//             headers: {
//               Authorization: `Bearer ${token}`,
//               'Content-Type': 'application/json',
//             },
//           }
//         );

//         if (!response.ok) {
//           throw new Error(`Erro ao buscar planos: ${response.status}`);
//         }

//         const data = await response.json();
//         setSubscriptionLinks(data);
//       } catch (error) {
//         console.error('Erro ao buscar subscription-plans:', error);
//         setSubscriptionLinks([]);
//       }
//     };

//     if (isOpen && token) {
//       loadSubscriptionLinks();
//     }
//   }, [isOpen, token]);

//   const getAvailablePaymentMethods = () => {
//     if (isAppointmentPayment) return ['credit', 'debit', 'pix'];
//     return ['credit'];
//   };
//   const availableMethods = getAvailablePaymentMethods();

//   const getFinalPrice = () => {
//     if (isAppointmentPayment) return selectedPlan.price;
//     if (paymentMethod === 'credit') return selectedPlan.price * 1.05;
//     return selectedPlan.price;
//   };

//   const resetPixState = () => {
//     setShowPixQrModal(false);
//     setPixQrCodeBase64('');
//     setPixQrCode('');
//     setPixPaymentId(null);
//     pixPaymentIdRef.current = null;
//     setPixTimer(600);
//     setPixExpired(false);
//     setPixQrCopied(false);
//     if (pixPollingRef.current) {
//       clearInterval(pixPollingRef.current);
//       pixPollingRef.current = null;
//     }
//   };

//   const handleClose = () => {
//     resetPixState();
//     onClose();
//   };

//   useEffect(() => {
//     if (pixExpired && showPixQrModal) {

//       if (pixPollingRef.current) {
//         clearInterval(pixPollingRef.current);
//         pixPollingRef.current = null;
//       }

//       setShowPixQrModal(false);

//       onPixExpired && onPixExpired();
//     }
//   }, [pixExpired]);

//   useEffect(() => {
//     if (
//       !isRecurringSubscription &&
//       !window.MercadoPago &&
//       isOpen &&
//       (paymentMethod === 'credit' || paymentMethod === 'debit')
//     ) {
//       const script = document.createElement('script');
//       script.src = 'https://sdk.mercadopago.com/js/v2';
//       script.async = true;
//       script.onload = () => {
//         const mp = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, { locale: 'pt-BR' });
//         setMercadoPagoInstance(mp);
//       };
//       document.body.appendChild(script);
//       return () => { if (script.parentNode) document.body.removeChild(script); };
//     } else if (!isRecurringSubscription && window.MercadoPago && !mercadoPagoInstance) {
//       const mp = new window.MercadoPago(MERCADO_PAGO_PUBLIC_KEY, { locale: 'pt-BR' });
//       setMercadoPagoInstance(mp);
//     }
//   }, [isOpen, paymentMethod, mercadoPagoInstance, isRecurringSubscription]);

//   useEffect(() => {
//     if (
//       !isRecurringSubscription &&
//       mercadoPagoInstance &&
//       (paymentMethod === 'credit' || paymentMethod === 'debit') &&
//       isOpen &&
//       !brickLoaded &&
//       !isRenderingBrick.current &&
//       !paymentStatus
//     ) {
//       renderCardPaymentBrick();
//     }
//     return () => {
//       if (brickController && !isOpen) {
//         brickController.unmount();
//         setBrickController(null);
//         setBrickLoaded(false);
//       }
//     };
//   }, [mercadoPagoInstance, paymentMethod, isOpen, brickLoaded, isRecurringSubscription, paymentStatus]);

//   useEffect(() => {
//     if (paymentMethod === 'pix' && brickController) {
//       brickController.unmount();
//       setBrickController(null);
//       setBrickLoaded(false);
//     }
//     if (paymentMethod !== 'pix') {
//       resetPixState();
//     }
//   }, [paymentMethod]);

//   useEffect(() => {
//     if (pixPollingRef.current) {
//       clearInterval(pixPollingRef.current);
//       pixPollingRef.current = null;
//     }
//     if (showPixQrModal && pixQrCodeBase64 && !pixExpired && pixPaymentId) {
//       pixPollingRef.current = setInterval(() => {
//         if (pixPaymentIdRef.current) verificarStatusPix(pixPaymentIdRef.current);
//       }, 10000);
//     }
//     return () => {
//       if (pixPollingRef.current) {
//         clearInterval(pixPollingRef.current);
//         pixPollingRef.current = null;
//       }
//     };
//   }, [showPixQrModal, pixQrCodeBase64, pixExpired, pixPaymentId]);

//   useEffect(() => {
//     let interval;
//     if (showPixQrModal && pixQrCodeBase64 && !pixExpired) {
//       interval = setInterval(() => {
//         setPixTimer((prev) => {
//           if (prev <= 1) {
//             clearInterval(interval);
//             setPixExpired(true);
//             return 0;
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     }
//     return () => { if (interval) clearInterval(interval); };
//   }, [showPixQrModal, pixQrCodeBase64, pixExpired]);

//   useEffect(() => {
//     setShowErrorToast(false);
//     setErrorMessage('');
//   }, [paymentMethod]);

//   useEffect(() => {
//     setPaymentStatus(null);
//   }, [paymentMethod]);

//   useEffect(() => {
//     if (isOpen && currentUser?.id && !isRecurringSubscription) checkUserCards();
//   }, [isOpen, currentUser, isRecurringSubscription]);

//   useEffect(() => {
//     const loadTermsDoc = async () => {
//       try {
//         const data = await getTermsDocument();
//         setTermsDocUrl(data.documentUrl || '');
//       } catch (error) {
//         console.error('Erro ao carregar documento de termos:', error);
//       }
//     };
//     if (isOpen) loadTermsDoc();
//   }, [isOpen]);

//   const gerarPixPayment = async () => {
//     setPixGenerating(true);
//     setShowErrorToast(false);
//     setShowPixQrModal(true);
//     try {
//       const pixPayload = {
//         transaction_amount: getFinalPrice(),
//         payment_method_id: 'pix',
//         payer: { email: currentUser.email },
//         description: isAppointmentPayment
//           ? `Pagamento - ${selectedPlan.serviceName || selectedPlan.name || 'Serviço'}`
//           : `Assinatura - ${selectedPlan.name}`,
//         id: selectedPlan.paymentData.products[0].id,
//         title: selectedPlan.paymentData.products[0].name,
//         quantity: selectedPlan.paymentData.products[0].quantity,
//         category_id: selectedPlan.paymentData.products[0].category,
//         unit_price: Number(selectedPlan.paymentData.products[0].price),
//       };

//       const result = await processMercadoPagoPaymentPix(pixPayload);

//       setPixQrCodeBase64(result?.qr_code_base64 || '');
//       setPixQrCode(result?.qr_code || '');
//       setPixPaymentId(result.id);
//       pixPaymentIdRef.current = result.id;
//     } catch (error) {
//       console.error('Erro ao gerar PIX:', error);
//       setErrorMessage('Erro ao gerar QR Code PIX. Tente novamente.');
//       setShowErrorToast(true);
//       setShowPixQrModal(false);
//     } finally {
//       setPixGenerating(false);
//     }
//   };

//   const verificarStatusPix = async (idPix) => {
//     try {
//       const result = await checkPixStatus(idPix);

//       if (isAppointmentPayment && result === 'approved') {
//         clearInterval(pixPollingRef.current);
//         pixPollingRef.current = null;

//         const paymentMethodString = 'pix';
//         const finalAmount = getFinalPrice();

//         if (selectedPlan.needsCreation && selectedPlan.appointmentData && selectedPlan.paymentData) {
//           const appointmentResponse = await fetch(`${import.meta.env.VITE_API_URL}/appointments`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(selectedPlan.appointmentData),
//           });
//           if (!appointmentResponse.ok) throw new Error('Erro ao criar agendamento');
//           const createdAppointment = await appointmentResponse.json();

//           await criarPagamentoAgendamento({
//             ...selectedPlan.paymentData,
//             appointmentId: createdAppointment.id,
//             status: 'paid',
//             paymentMethod: paymentMethodString,
//             paidAt: new Date().toISOString(),
//             amount: finalAmount,
//             mercadoPagoId: idPix,
//             cardData: { brand: undefined, lastDigits: '****' },
//           });
//         } else if (paymentId) {
//           await atualizarPagamentoAgendamento(paymentId, {
//             status: 'paid',
//             paymentMethod: paymentMethodString,
//             paidAt: new Date().toISOString(),
//             amount: finalAmount,
//             mercadoPagoId: idPix,
//             cardData: { brand: undefined, lastDigits: '****' },
//           });
//         }

//         onSuccess && onSuccess(paymentMethodString);
//         setProcessing(false);
//         setShowPixQrModal(false);
//         onClose();
//       }
//     } catch (error) {
//       console.error('Erro ao verificar status PIX:', error);
//       setErrorMessage('Erro ao confirmar pagamento PIX. Tente novamente.');
//       setShowErrorToast(true);
//       setProcessing(false);
//     }
//   };

//   const renderCardPaymentBrick = async () => {
//     if (isRenderingBrick.current) return;
//     isRenderingBrick.current = true;
//     try {
//       if (brickController) {
//         await brickController.unmount();
//         setBrickController(null);
//       }
//       const container = document.getElementById('cardPaymentBrick_container');
//       if (container) container.innerHTML = '';

//       const bricksBuilder = mercadoPagoInstance.bricks();
//       const controller = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
//         initialization: { amount: getFinalPrice() },
//         customization: {
//           visual: {
//             style: {
//               theme: 'dark',
//               customVariables: {
//                 baseColor: '#ff7a1a',
//                 textPrimaryColor: '#ffffff',
//                 textSecondaryColor: '#b0b0b0',
//                 inputBackgroundColor: '#242424',
//                 formBackgroundColor: '#1a1a1a',
//                 borderRadiusSmall: '8px',
//                 borderRadiusMedium: '12px',
//                 borderRadiusLarge: '16px',
//               },
//             },
//           },
//           paymentMethods: {
//             maxInstallments: paymentMethod === 'credit' ? 12 : 1,
//             minInstallments: 1,
//             types: {
//               excluded: paymentMethod === 'debit' ? ['credit_card'] : ['debit_card'],
//             },
//           },
//         },
//         callbacks: {
//           onReady: () => {
//             setBrickLoaded(true);
//             isRenderingBrick.current = false;
//           },
//           onSubmit: async (cardFormData) => handleMercadoPagoSubmit(cardFormData),
//           onError: (error) => {
//             console.error('Erro no Card Payment Brick:', error);
//             setErrorMessage('Erro ao processar pagamento. Verifique os dados do cartão.');
//             setShowErrorToast(true);
//             isRenderingBrick.current = false;
//           },
//         },
//       });
//       setBrickController(controller);
//     } catch (error) {
//       console.error('Erro ao renderizar Card Payment Brick:', error);
//       setErrorMessage('Erro ao carregar formulário de pagamento. Tente novamente.');
//       setShowErrorToast(true);
//       isRenderingBrick.current = false;
//     }
//   };

//   const handleResetPayment = async () => {
//     if (brickController) {
//       try { await brickController.unmount(); } catch (_) { }
//     }
//     setBrickController(null);
//     setBrickLoaded(false);
//     isRenderingBrick.current = false;
//     setPaymentStatus(null);
//     setShowErrorToast(false);
//     setErrorMessage('');
//   };

//   const handleMercadoPagoSubmit = async (cardFormData) => {
//     if (!isAppointmentPayment && !acceptedTerms) {
//       setValidationToast({ show: true, message: 'Você precisa aceitar os termos de contratação' });
//       setTimeout(() => setValidationToast({ show: false, message: '' }), 4000);
//       return new Promise((_, reject) => reject(new Error('Terms not accepted')));
//     }

//     setProcessing(true);
//     setShowErrorToast(false);
//     setErrorMessage('');


//     try {
//       const paymentData = {
//         token: cardFormData.token,
//         transaction_amount: getFinalPrice(),
//         installments: cardFormData.installments,
//         payment_method_id: cardFormData.payment_method_id,
//         issuer_id: cardFormData.issuer_id,
//         payer: {
//           email: cardFormData.payer.email,
//           identification: {
//             type: cardFormData.payer.identification.type,
//             number: cardFormData.payer.identification.number,
//           },
//         },
//         id: selectedPlan.paymentData.products[0].id,
//         title: selectedPlan.paymentData.products[0].name,
//         quantity: selectedPlan.paymentData.products[0].quantity,
//         category_id: selectedPlan.paymentData.products[0].category,
//         unit_price: Number(selectedPlan.paymentData.products[0].price),
//         description: isAppointmentPayment
//           ? `Pagamento - ${selectedPlan.serviceName || selectedPlan.name || 'Serviço'}`
//           : `Assinatura - ${selectedPlan.name}`,
//       };

//       const paymentResult = await processMercadoPagoPayment(paymentData);

//       if (paymentResult.status === 'approved' || paymentResult.status === 'authorized') {
//         const finalAmount = getFinalPrice();
//         const paymentMethodString = paymentMethod === 'credit' ? 'credito' : 'debito';

//         if (isAppointmentPayment) {
//           if (selectedPlan.needsCreation && selectedPlan.appointmentData && selectedPlan.paymentData) {
//             const appointmentResponse = await fetch(
//               `${import.meta.env.VITE_API_URL}/appointments`,
//               {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(selectedPlan.appointmentData),
//               }
//             );
//             if (!appointmentResponse.ok) throw new Error('Erro ao criar agendamento');
//             const createdAppointment = await appointmentResponse.json();

//             await criarPagamentoAgendamento({
//               ...selectedPlan.paymentData,
//               appointmentId: createdAppointment.id,
//               status: 'paid',
//               paymentMethod: paymentMethodString,
//               paidAt: new Date().toISOString(),
//               amount: finalAmount,
//               mercadoPagoId: paymentResult.id,
//               mercadoPagoStatus: paymentResult.status,
//               cardData: {
//                 brand: paymentResult.payment_method_id,
//                 lastDigits: paymentResult.card?.last_four_digits || '****',
//               },
//             });
//           } else if (paymentId) {
//             await atualizarPagamentoAgendamento(paymentId, {
//               status: 'paid',
//               paymentMethod: paymentMethodString,
//               paidAt: new Date().toISOString(),
//               amount: finalAmount,
//               mercadoPagoId: paymentResult.id,
//               mercadoPagoStatus: paymentResult.status,
//               cardData: {
//                 brand: paymentResult.payment_method_id,
//                 lastDigits: paymentResult.card?.last_four_digits || '****',
//               },
//             });
//           }
//           onSuccess && onSuccess(paymentMethodString);
//         } else {
//           const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
//           await criarPagamentoAgendamento({
//             userId: currentUser.id,
//             userName: currentUser.name,
//             planId: selectedPlan.id,
//             planName: selectedPlan.name,
//             amount: finalAmount,
//             paymentMethod: paymentMethodString,
//             status: 'approved',
//             type: 'subscription',
//             transactionId,
//             mercadoPagoId: paymentResult.id,
//             mercadoPagoStatus: paymentResult.status,
//             installments: cardFormData.installments || 1,
//             installmentAmount: (finalAmount / (cardFormData.installments || 1)).toFixed(2),
//             cardData: {
//               brand: paymentResult.payment_method_id,
//               lastDigits: paymentResult.card?.last_four_digits || '****',
//             },
//             createdAt: new Date().toISOString(),
//             approvedAt: new Date().toISOString(),
//           });

//           const subscription = await criarAssinatura({
//             userId: currentUser.id,
//             userName: currentUser.name,
//             planId: selectedPlan.id,
//             planName: selectedPlan.name,
//             planPrice: selectedPlan.price,
//             amount: finalAmount,
//             status: 'active',
//             paymentMethod: paymentMethodString,
//             isRecurring: selectedPlan.isRecurring ?? true,
//             autoRenewal: selectedPlan.autoRenewal ?? true,
//           });

//           try {
//             await enviarNotificacaoAssinatura(subscription);
//           } catch (error) {
//             console.error('Erro ao enviar notificação (não crítico):', error);
//           }

//           onSuccess && onSuccess(subscription);
//         }

//         setProcessing(false);
//         onClose();
//         return { status: 'success' };

//       } else if (paymentResult.status === 'rejected') {
//         setPaymentStatus('rejected');
//         setProcessing(false);
//         return new Promise((_, reject) => reject(new Error('Payment rejected')));
//       } else {
//         setPaymentStatus('pending');
//         setErrorMessage(
//           `Pagamento em análise (status: ${paymentResult.status}). Você receberá uma confirmação em breve.`
//         );
//         setShowErrorToast(true);
//         setProcessing(false);
//         return { status: paymentResult.status };
//       }
//     } catch (error) {
//       setErrorMessage(error.message || 'Erro ao processar pagamento. Tente novamente.');
//       setShowErrorToast(true);
//       setProcessing(false);
//       return new Promise((_, reject) => reject(error));
//     }
//   };

//   // const handleMercadoPagoPreferSubmit = async () => {

//   //   setProcessing(true);
//   //   setShowErrorToast(false);
//   //   setErrorMessage('');

//   //   try {
//   //     const products = selectedPlan.paymentData?.products || [];
//   //     const services = selectedPlan.paymentData?.services || [];
//   //     const hasProducts = products.length > 0;
//   //     const hasServices = services.length > 0;
//   //     const serviceName = selectedPlan.paymentData?.serviceName || selectedPlan.serviceName || 'Serviço';

//   //     const parsePrice = (val) => {
//   //       if (typeof val === 'number') return val;
//   //       return parseFloat(String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
//   //     };


//   //     const MP_CATEGORIES = [
//   //       'art', 'baby', 'coupons', 'donations', 'computing', 'cameras', 'video_games',
//   //       'tv', 'electronics', 'automotive', 'entertainment', 'fashion', 'games',
//   //       'home', 'musical_instruments', 'phones', 'food', 'health', 'services',
//   //       'learnings', 'tickets', 'travels', 'virtual_goods', 'others'
//   //     ];
//   //     const getMpCategory = (cat) => {
//   //       if (!cat) return 'others';
//   //       const lower = cat.toLowerCase();
//   //       if (MP_CATEGORIES.includes(lower)) return lower;
//   //       if (lower.includes('servi')) return 'services';
//   //       if (lower.includes('bebid') || lower.includes('aliment') || lower.includes('comid')) return 'food';
//   //       if (lower.includes('saude') || lower.includes('saúde')) return 'health';
//   //       if (lower.includes('moda') || lower.includes('roupa') || lower.includes('acess')) return 'fashion';
//   //       return 'others';
//   //     };

//   //     const items = [];


//   //     if (hasProducts && !hasServices) {
//   //       products.forEach((p, i) => {
//   //         items.push({
//   //           id: String(p.id || `product-${i}`),
//   //           title: p.name,
//   //           quantity: p.quantity || 1,
//   //           unit_price: Number(p.calculatedPrice || parsePrice(p.price)),
//   //           category_id: getMpCategory(p.category),
//   //           picture_url: p.image
//   //         });
//   //       });
//   //     }

//   //     if (hasServices && !hasProducts) {
//   //       services.forEach((s) => {
//   //         const isCovered = s.coveredByPlan && selectedPlan.paymentData?.hasActiveSubscription;
//   //         if (!isCovered) {
//   //           items.push({
//   //             id: String(s.id || `service-${s.name}`),
//   //             title: s.name,
//   //             quantity: 1,
//   //             unit_price: Number(parsePrice(s.price)),
//   //             category_id: 'services',
//   //             picture_url: s.image

//   //           });
//   //         }
//   //       });
//   //     }

//   //     if (hasServices && hasProducts) {
//   //       services.forEach((s) => {

//   //         const isCovered = s.coveredByPlan && selectedPlan.paymentData?.hasActiveSubscription;
//   //         if (!isCovered) {
//   //           items.push({
//   //             id: String(s.id || `service-${s.name}`),
//   //             title: s.name,
//   //             quantity: 1,
//   //             unit_price: Number(parsePrice(s.price)),
//   //             category_id: 'services',
//   //             picture_url: s.image

//   //           });
//   //         }
//   //       });
//   //       products.forEach((p, i) => {
//   //         items.push({
//   //           id: String(p.id || `product-${i}`),
//   //           title: p.name,
//   //           quantity: p.quantity || 1,
//   //           unit_price: Number(p.calculatedPrice || parsePrice(p.price)),
//   //           category_id: getMpCategory(p.category),
//   //           picture_url: p.image

//   //         });
//   //       });
//   //     }

//   //     const itemsDescription = items.map(i => i.title).join(', ');

//   //     const paymentData = {
//   //       transaction_amount: getFinalPrice(),
//   //       items,
//   //       description: isAppointmentPayment
//   //         ? `Pagamento - ${itemsDescription}`
//   //         : `Assinatura - ${selectedPlan.name}`,
//   //     };


//   //     console.log(' paymentData enviado ao MP:', JSON.stringify(paymentData, null, 2));
//   //     console.log(' selectedPlan.price:', selectedPlan.price);
//   //     console.log(' getFinalPrice():', getFinalPrice());

//   //     const paymentResult = await processMercadoPagoPayment(paymentData);
//   //     if (paymentResult.init_point) {

//   //       sessionStorage.setItem('mp_pending_plan', JSON.stringify({
//   //         selectedPlan,
//   //         isAppointmentPayment,
//   //         finalTotal: getFinalPrice(),
//   //       }));
//   //       window.location.href = paymentResult.init_point;
//   //     }
//   //     // if (paymentResult.status === 'approved' || paymentResult.status === 'authorized') {
//   //     //   const finalAmount = getFinalPrice();
//   //     //   const paymentMethodString = paymentMethod === 'credit' ? 'credito' : 'debito';

//   //     //   if (isAppointmentPayment) {
//   //     //     if (selectedPlan.needsCreation && selectedPlan.appointmentData && selectedPlan.paymentData) {
//   //     //       const appointmentResponse = await fetch(
//   //     //         `${import.meta.env.VITE_API_URL}/appointments`,
//   //     //         {
//   //     //           method: 'POST',
//   //     //           headers: { 'Content-Type': 'application/json' },
//   //     //           body: JSON.stringify(selectedPlan.appointmentData),
//   //     //         }
//   //     //       );
//   //     //       if (!appointmentResponse.ok) throw new Error('Erro ao criar agendamento');
//   //     //       const createdAppointment = await appointmentResponse.json();

//   //     //       await criarPagamentoAgendamento({
//   //     //         ...selectedPlan.paymentData,
//   //     //         appointmentId: createdAppointment.id,
//   //     //         status: 'paid',
//   //     //         paymentMethod: paymentMethodString,
//   //     //         paidAt: new Date().toISOString(),
//   //     //         amount: finalAmount,
//   //     //         mercadoPagoId: paymentResult.id,
//   //     //         mercadoPagoStatus: paymentResult.status,
//   //     //         cardData: {
//   //     //           brand: paymentResult.payment_method_id,
//   //     //           lastDigits: paymentResult.card?.last_four_digits || '****',
//   //     //         },
//   //     //       });
//   //     //     } else if (paymentId) {
//   //     //       await atualizarPagamentoAgendamento(paymentId, {
//   //     //         status: 'paid',
//   //     //         paymentMethod: paymentMethodString,
//   //     //         paidAt: new Date().toISOString(),
//   //     //         amount: finalAmount,
//   //     //         mercadoPagoId: paymentResult.id,
//   //     //         mercadoPagoStatus: paymentResult.status,
//   //     //         cardData: {
//   //     //           brand: paymentResult.payment_method_id,
//   //     //           lastDigits: paymentResult.card?.last_four_digits || '****',
//   //     //         },
//   //     //       });
//   //     //     }
//   //     //     onSuccess && onSuccess(paymentMethodString);
//   //     //   } else {
//   //     //     const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
//   //     //     await criarPagamentoAgendamento({
//   //     //       userId: currentUser.id,
//   //     //       userName: currentUser.name,
//   //     //       planId: selectedPlan.id,
//   //     //       planName: selectedPlan.name,
//   //     //       amount: finalAmount,
//   //     //       paymentMethod: paymentMethodString,
//   //     //       status: 'approved',
//   //     //       type: 'subscription',
//   //     //       transactionId,
//   //     //       mercadoPagoId: paymentResult.id,
//   //     //       mercadoPagoStatus: paymentResult.status,
//   //     //       installments: cardFormData.installments || 1,
//   //     //       installmentAmount: (finalAmount / (cardFormData.installments || 1)).toFixed(2),
//   //     //       cardData: {
//   //     //         brand: paymentResult.payment_method_id,
//   //     //         lastDigits: paymentResult.card?.last_four_digits || '****',
//   //     //       },
//   //     //       createdAt: new Date().toISOString(),
//   //     //       approvedAt: new Date().toISOString(),
//   //     //     });

//   //     //     const subscription = await criarAssinatura({
//   //     //       userId: currentUser.id,
//   //     //       userName: currentUser.name,
//   //     //       planId: selectedPlan.id,
//   //     //       planName: selectedPlan.name,
//   //     //       planPrice: selectedPlan.price,
//   //     //       amount: finalAmount,
//   //     //       status: 'active',
//   //     //       paymentMethod: paymentMethodString,
//   //     //       isRecurring: selectedPlan.isRecurring ?? true,
//   //     //       autoRenewal: selectedPlan.autoRenewal ?? true,
//   //     //     });

//   //     //     try {
//   //     //       await enviarNotificacaoAssinatura(subscription);
//   //     //     } catch (error) {
//   //     //       console.error('Erro ao enviar notificação (não crítico):', error);
//   //     //     }

//   //     //     onSuccess && onSuccess(subscription);
//   //     //   }

//   //     //   setProcessing(false);
//   //     //   onClose();
//   //     //   return { status: 'success' };

//   //     // } else if (paymentResult.status === 'rejected') {
//   //     //   setPaymentStatus('rejected');
//   //     //   setProcessing(false);
//   //     //   return new Promise((_, reject) => reject(new Error('Payment rejected')));
//   //     // } else {
//   //     //   setPaymentStatus('pending');
//   //     //   setErrorMessage(
//   //     //     `Pagamento em análise (status: ${paymentResult.status}). Você receberá uma confirmação em breve.`
//   //     //   );
//   //     //   setShowErrorToast(true);
//   //     //   setProcessing(false);
//   //     //   return { status: paymentResult.status };
//   //     // }
//   //   } catch (error) {
//   //     setErrorMessage(error.message || 'Erro ao processar pagamento. Tente novamente.');
//   //     setShowErrorToast(true);
//   //     setProcessing(false);
//   //     return new Promise((_, reject) => reject(error));
//   //   }
//   // };

//   const handleCopyPixKey = () => {
//     if (pixQrCode) {
//       navigator.clipboard.writeText(pixQrCode);
//       setPixQrCopied(true);
//       setTimeout(() => setPixQrCopied(false), 3000);
//     }
//   };

//   const handleDownloadTerms = async (e) => {
//     e.preventDefault();
//     if (!termsDocUrl) return;
//     try {
//       const response = await fetch(termsDocUrl);
//       const blob = await response.blob();
//       const url = URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = 'termos-contratacao.pdf';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       setTimeout(() => URL.revokeObjectURL(url), 1000);
//     } catch (error) {
//       console.error('Erro ao baixar documento de termos:', error);
//     }
//   };

//   // const handleRecurringSubscription = () => {
//   //   if (!acceptedTerms) {
//   //     setValidationToast({ show: true, message: 'Você precisa aceitar os termos de contratação' });
//   //     setTimeout(() => setValidationToast({ show: false, message: '' }), 4000);
//   //     return;
//   //   }
//   //   const subscriptionLink = subscriptionLinks[selectedPlan.price];
//   //   if (!subscriptionLink) {
//   //     setErrorMessage('Plano de assinatura não encontrado. Entre em contato com o suporte.');
//   //     setShowErrorToast(true);
//   //     return;
//   //   }
//   //   window.open(subscriptionLink, '_blank');
//   // };

//   const handleRecurringSubscription = () => {
//     if (!acceptedTerms) {
//       setValidationToast({ show: true, message: 'Você precisa aceitar os termos de contratação' });
//       setTimeout(() => setValidationToast({ show: false, message: '' }), 4000);
//       return;
//     }

//     const planFound = subscriptionLinks.find(
//       (plan) => Number(plan.price) === Number(selectedPlan.price)
//     );

//     const subscriptionLink = planFound?.mpSubscriptionUrl;

//     if (!subscriptionLink) {
//       setErrorMessage('Plano de assinatura não encontrado. Entre em contato com o suporte.');
//       setShowErrorToast(true);
//       return;
//     }

//     window.open(subscriptionLink, '_blank');
//   };

//   const checkUserCards = async () => {
//     try {
//       const cards = await getUserCards(currentUser.id);
//       setHasCards(cards.length > 0);
//     } catch {
//       setHasCards(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <>

//       <div className="payment-modal-overlay" onClick={handleClose}>
//         <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
//           <button className="payment-modal-close" onClick={handleClose}>×</button>

//           <div className="payment-modal-header">
//             <h2>
//               {paymentStatus === 'rejected'
//                 ? 'Pagamento Recusado'
//                 : paymentStatus === 'in_process'
//                   ? 'Pagamento em Análise'
//                   : isRecurringSubscription
//                     ? 'Confirme sua assinatura'
//                     : isAppointmentPayment
//                       ? 'Finalizar pagamento do agendamento'
//                       : 'Complete os dados para finalizar sua compra'}
//             </h2>
//             {!isAppointmentPayment && (
//               <p className="payment-modal-subtitle">Assinatura do plano {selectedPlan.name}</p>
//             )}
//           </div>

//           {showErrorToast && (
//             <div className="toast-notification">
//               <div className="toast-notification__content">
//                 <span className="toast-notification__icon">⚠️</span>
//                 <p>{errorMessage}</p>
//               </div>
//               <button className="toast-notification__close" onClick={() => setShowErrorToast(false)}>×</button>
//             </div>
//           )}

//           {validationToast.show && (
//             <div className="toast-notification">
//               <div className="toast-notification__content">
//                 <span className="toast-notification__icon">❌</span>
//                 <p>{validationToast.message}</p>
//               </div>
//             </div>
//           )}

//           {paymentStatus === 'in_process' && (
//             <div className="payment-status-screen">
//               <div className="payment-status-icon processing-icon">
//                 <div className="processing-spinner-large"></div>
//               </div>
//               <h2>Pagamento em Análise</h2>
//               <p>Seu pagamento está sendo processado pela operadora. Você receberá uma confirmação em breve.</p>
//               <button type="button" className="payment-status-btn" onClick={handleClose}>Fechar</button>
//             </div>
//           )}

//           {paymentStatus === 'rejected' && (
//             <div className="payment-status-screen">
//               <div className="payment-status-icon rejected-icon"><span>✕</span></div>
//               <h2>Pagamento Recusado</h2>
//               <p>Verifique os dados do cartão ou tente outra forma de pagamento.</p>
//               <div className="payment-status-actions">
//                 <button type="button" className="payment-status-btn retry" onClick={handleResetPayment}>
//                   Tentar Novamente
//                 </button>
//                 <button type="button" className="payment-status-btn cancel" onClick={handleClose}>
//                   Cancelar
//                 </button>
//               </div>
//             </div>
//           )}

//           {!paymentStatus && (
//             <div className="payment-modal-body">
//               <div className="payment-plan-summary">
//                 <h3>{selectedPlan.name}</h3>
//                 <p className="payment-plan-price">
//                   R$ {selectedPlan.price.toFixed(2).replace('.', ',')}
//                   {isRecurringSubscription && <span className="recurring-badge"> /mês</span>}
//                 </p>
//               </div>

//               {isRecurringSubscription ? (
//                 <div className="recurring-subscription-content">
//                   <div className="recurring-info">
//                     <h4>🔄 Assinatura Recorrente</h4>
//                     <ul>
//                       <li>✓ Cobrança automática mensal</li>
//                       <li>✓ Cancele quando quiser</li>
//                       <li>✓ Sem taxas de cancelamento</li>
//                       <li>✓ Processamento seguro pelo Mercado Pago</li>
//                     </ul>
//                   </div>
//                   <div className="payment-terms-section">
//                     <div className="payment-terms-box">
//                       <h4>📄 Termos de Contratação</h4>
//                       <p>Leia atentamente nossos termos de contratação antes de prosseguir.</p>
//                       {termsDocUrl && (
//                         <a href={termsDocUrl} onClick={handleDownloadTerms} className="payment-terms-download">
//                           📥 Baixar Termos
//                         </a>
//                       )}
//                     </div>
//                     <label className="payment-terms-checkbox">
//                       <input
//                         type="checkbox"
//                         checked={acceptedTerms}
//                         onChange={(e) => setAcceptedTerms(e.target.checked)}
//                       />
//                       <span>Li e aceito os termos de contratação e autorizo a cobrança recorrente mensal</span>
//                     </label>
//                   </div>
//                   <div className="payment-modal-footer">
//                     <button type="button" onClick={handleClose}>Cancelar</button>
//                     <button
//                       type="button"
//                       onClick={handleRecurringSubscription}
//                       disabled={!acceptedTerms}
//                       className="recurring-button"
//                     >
//                       Prosseguir para Pagamento
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <>
//                   <div className="payment-methods">
//                     {availableMethods.map((method) => (
//                       <button
//                         key={method}
//                         type="button"
//                         className={`payment-method-btn ${paymentMethod === method ? 'active' : ''}`}
//                         onClick={() => setPaymentMethod(method)}
//                       >
//                         {method === 'pix' ? 'PIX' : method === 'credit' ? 'Crédito' : 'Débito'}
//                       </button>
//                     ))}
//                   </div>

//                   {paymentMethod === 'pix' ? (
//                     <div className="pix-payment-section">
//                       <div className="pix-instructions pix-instructions--pre">
//                         <h4>Como funciona:</h4>
//                         <ol>
//                           <li>Clique em <strong>"Gerar QR Code"</strong></li>
//                           <li>Escaneie o código no app do seu banco</li>
//                           <li>O pagamento será confirmado automaticamente</li>
//                         </ol>
//                       </div>

//                       {showErrorToast && (
//                         <p className="pix-gen-error">Não foi possível gerar o QR Code. Tente novamente.</p>
//                       )}

//                       <div className="payment-modal-footer">
//                         <button type="button" onClick={handleClose}>Cancelar</button>
//                         <button
//                           type="button"
//                           onClick={gerarPixPayment}
//                           disabled={pixGenerating}
//                         >
//                           {pixGenerating ? 'Gerando...' : 'Gerar QR Code'}
//                         </button>
//                       </div>
//                     </div>
//                   ) : (

//                     <>
//                       <div id="cardPaymentBrick_container"></div>  

//                       {isAppointmentPayment && (
//                         <div className="payment-modal-footer">
//                           <button type="button" onClick={handleClose}>Cancelar</button>
//                           <button type="button" onClick={handleMercadoPagoSubmit}>Pagar</button>
//                         </div>
//                       )}
//                       {!isAppointmentPayment && (
//                         <div className="payment-terms-section">
//                           <div className="payment-terms-box">
//                             <h4>📄 Termos de Contratação</h4>
//                             <p>Leia atentamente nossos termos de contratação antes de prosseguir com o pagamento.</p>
//                             {termsDocUrl && (
//                               <a href={termsDocUrl} onClick={handleDownloadTerms} className="payment-terms-download">
//                                 📥 Baixar Termos
//                               </a>
//                             )}
//                           </div>
//                           <label className="payment-terms-checkbox">
//                             <input
//                               type="checkbox"
//                               checked={acceptedTerms}
//                               onChange={(e) => setAcceptedTerms(e.target.checked)}
//                             />
//                             <span>Li e aceito os termos de contratação</span>
//                           </label>
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </>
//               )}
//             </div>
//           )}
//         </div>
//       </div>


//       {showPixQrModal && (
//         <PixQrModal
//           pixQrCodeBase64={pixQrCodeBase64}
//           pixQrCode={pixQrCode}
//           pixTimer={pixTimer}
//           pixExpired={pixExpired}
//           pixQrCopied={pixQrCopied}
//           pixGenerating={pixGenerating}
//           onCopy={handleCopyPixKey}
//           onClose={() => setShowPixQrModal(false)}
//         />
//       )}


//       {processing && (
//         <div className="processing-overlay">
//           <div className="processing-content">
//             <div className="processing-spinner-large"></div>
//             <h2>Processando Pagamento</h2>
//             <p>Aguarde enquanto confirmamos sua transação</p>
//             <div className="processing-dots">
//               <span></span><span></span><span></span>
//             </div>
//           </div>
//         </div>
//       )}

//       {showSavedCards && (
//         <SavedCardsModal
//           isOpen={showSavedCards}
//           onClose={() => setShowSavedCards(false)}
//           userId={currentUser.id}
//           onSelectCard={(card) => console.log('Card selected:', card)}
//         />
//       )}
//     </>
//   );
// }



// *** STRIPE PAYMENT MODAL - VERSÃO INICIAL COM ELEMENTS E PAYMENT INTENT - AINDA EM DESENVOLVIMENTO ***//
// src/components/ui/PaymentModal.jsx
// import { useEffect, useMemo, useState } from 'react';
// import { loadStripe } from '@stripe/stripe-js';
// import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
// import {
//   criarAssinatura,
//   criarPagamentoAgendamento,
//   atualizarPagamentoAgendamento,
//   enviarNotificacaoAssinatura,
// } from '../../services/paymentService';
// import { getTermsDocument } from '../../services/termsService';
// import { createStripePaymentIntent } from '../../services/stripeService';
// import './PaymentModal.css';
// import { getToken } from '../../services/authService';

// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// function StripePaymentForm({
//   isOpen,
//   onClose,
//   selectedPlan,
//   currentUser,
//   onSuccess,
//   isAppointmentPayment = false,
//   paymentId = null,
//   clientSecret,
// }) {
//   const stripe = useStripe();
//   const elements = useElements();
//   const token = getToken();

//   const [processing, setProcessing] = useState(false);
//   const [paymentStatus, setPaymentStatus] = useState(null);
//   const [showErrorToast, setShowErrorToast] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [acceptedTerms, setAcceptedTerms] = useState(false);
//   const [validationToast, setValidationToast] = useState({ show: false, message: '' });
//   const [termsDocUrl, setTermsDocUrl] = useState('');

//   useEffect(() => {
//     const loadTermsDoc = async () => {
//       try {
//         const data = await getTermsDocument();
//         setTermsDocUrl(data.documentUrl || '');
//       } catch (error) {
//         console.error('Erro ao carregar documento de termos:', error);
//       }
//     };

//     if (isOpen) loadTermsDoc();
//   }, [isOpen]);

//   const getFinalPrice = () => {
//     return Number(selectedPlan?.price || 0);
//   };

//   const handleDownloadTerms = async (e) => {
//     e.preventDefault();
//     if (!termsDocUrl) return;

//     try {
//       const response = await fetch(termsDocUrl);
//       const blob = await response.blob();
//       const url = URL.createObjectURL(blob);

//       const link = document.createElement('a');
//       link.href = url;
//       link.download = 'termos-contratacao.pdf';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);

//       setTimeout(() => URL.revokeObjectURL(url), 1000);
//     } catch (error) {
//       console.error('Erro ao baixar documento de termos:', error);
//     }
//   };

//   const handleClose = () => {
//     setShowErrorToast(false);
//     setErrorMessage('');
//     setPaymentStatus(null);
//     onClose();
//   };

//   const persistSuccessfulPayment = async (paymentIntent) => {
//     const finalAmount = getFinalPrice();

//     if (isAppointmentPayment) {
//       if (selectedPlan?.needsCreation && selectedPlan?.appointmentData && selectedPlan?.paymentData) {
//         const appointmentResponse = await fetch(
//           `${import.meta.env.VITE_API_URL}/appointments`,
//           {
//             method: 'POST',
//             headers: {
//               Authorization: `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(selectedPlan.appointmentData),
//           }
//         );

//         if (!appointmentResponse.ok) {
//           throw new Error('Erro ao criar agendamento');
//         }

//         const createdAppointment = await appointmentResponse.json();

//         await criarPagamentoAgendamento({
//           ...selectedPlan.paymentData,
//           appointmentId: createdAppointment.id,
//           status: 'paid',
//           paymentMethod: 'card',
//           paidAt: new Date().toISOString(),
//           amount: finalAmount,
//           paymentProvider: 'stripe',
//           stripePaymentIntentId: paymentIntent.id,
//           stripeStatus: paymentIntent.status,
//           // last4 e brand o ideal é salvar via webhook / backend com objeto expandido
//           cardData: {
//             brand: '',
//             lastDigits: '****',
//           },
//         });
//       } else if (paymentId) {
//         await atualizarPagamentoAgendamento(paymentId, {
//           status: 'paid',
//           paymentMethod: 'card',
//           paidAt: new Date().toISOString(),
//           amount: finalAmount,
//           paymentProvider: 'stripe',
//           stripePaymentIntentId: paymentIntent.id,
//           stripeStatus: paymentIntent.status,
//           cardData: {
//             brand: '',
//             lastDigits: '****',
//           },
//         });
//       }

//       onSuccess && onSuccess('card');
//       return;
//     }

//     const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;

//     await criarPagamentoAgendamento({
//       userId: currentUser.id,
//       userName: currentUser.name,
//       planId: selectedPlan.id,
//       planName: selectedPlan.name,
//       amount: finalAmount,
//       paymentMethod: 'card',
//       status: 'approved',
//       type: 'subscription',
//       transactionId,
//       paymentProvider: 'stripe',
//       stripePaymentIntentId: paymentIntent.id,
//       stripeStatus: paymentIntent.status,
//       createdAt: new Date().toISOString(),
//       approvedAt: new Date().toISOString(),
//       cardData: {
//         brand: '',
//         lastDigits: '****',
//       },
//     });

//     const subscription = await criarAssinatura({
//       userId: currentUser.id,
//       userName: currentUser.name,
//       planId: selectedPlan.id,
//       planName: selectedPlan.name,
//       planPrice: selectedPlan.price,
//       amount: finalAmount,
//       status: 'active',
//       paymentMethod: 'card',
//       isRecurring: selectedPlan.isRecurring ?? true,
//       autoRenewal: selectedPlan.autoRenewal ?? true,
//     });

//     try {
//       await enviarNotificacaoAssinatura(subscription);
//     } catch (error) {
//       console.error('Erro ao enviar notificação (não crítico):', error);
//     }

//     onSuccess && onSuccess(subscription);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!isAppointmentPayment && !acceptedTerms) {
//       setValidationToast({
//         show: true,
//         message: 'Você precisa aceitar os termos de contratação',
//       });
//       setTimeout(() => setValidationToast({ show: false, message: '' }), 4000);
//       return;
//     }

//     if (!stripe || !elements || !clientSecret) {
//       return;
//     }

//     setProcessing(true);
//     setShowErrorToast(false);
//     setErrorMessage('');

//     try {
//       const { error } = await stripe.confirmPayment({
//         elements,
//         redirect: 'if_required',
//         confirmParams: {
//           payment_method_data: {
//             billing_details: {
//               name: currentUser?.name || '',
//               email: currentUser?.email || '',
//             },
//           },
//           receipt_email: currentUser?.email || undefined,
//         },
//       });

//       if (error) {
//         setErrorMessage(error.message || 'Erro ao processar pagamento.');
//         setShowErrorToast(true);
//         setProcessing(false);
//         return;
//       }

//       const result = await stripe.retrievePaymentIntent(clientSecret);
//       const paymentIntent = result.paymentIntent;

//       if (!paymentIntent) {
//         throw new Error('Não foi possível confirmar o status do pagamento.');
//       }

//       if (paymentIntent.status === 'succeeded') {
//         await persistSuccessfulPayment(paymentIntent);
//         setProcessing(false);
//         onClose();
//         return;
//       }

//       if (paymentIntent.status === 'processing') {
//         setPaymentStatus('processing');
//         setErrorMessage('Pagamento em processamento. Aguarde a confirmação.');
//         setShowErrorToast(true);
//         setProcessing(false);
//         return;
//       }

//       if (paymentIntent.status === 'requires_payment_method') {
//         setPaymentStatus('rejected');
//         setErrorMessage('Pagamento recusado. Verifique os dados do cartão.');
//         setShowErrorToast(true);
//         setProcessing(false);
//         return;
//       }

//       setPaymentStatus(paymentIntent.status);
//       setErrorMessage(`Status do pagamento: ${paymentIntent.status}`);
//       setShowErrorToast(true);
//       setProcessing(false);
//     } catch (error) {
//       console.error('Erro ao confirmar pagamento Stripe:', error);
//       setErrorMessage(error.message || 'Erro ao processar pagamento. Tente novamente.');
//       setShowErrorToast(true);
//       setProcessing(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <>
//       <div className="payment-modal-overlay" onClick={handleClose}>
//         <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
//           <button className="payment-modal-close" onClick={handleClose}>×</button>

//           <div className="payment-modal-header">
//             <h2>
//               {paymentStatus === 'rejected'
//                 ? 'Pagamento Recusado'
//                 : paymentStatus === 'processing'
//                   ? 'Pagamento em Processamento'
//                   : isAppointmentPayment
//                     ? 'Finalizar pagamento do agendamento'
//                     : 'Complete os dados para finalizar sua compra'}
//             </h2>

//             {!isAppointmentPayment && (
//               <p className="payment-modal-subtitle">
//                 Assinatura do plano {selectedPlan.name}
//               </p>
//             )}
//           </div>

//           {showErrorToast && (
//             <div className="toast-notification">
//               <div className="toast-notification__content">
//                 <span className="toast-notification__icon">⚠️</span>
//                 <p>{errorMessage}</p>
//               </div>
//               <button
//                 className="toast-notification__close"
//                 onClick={() => setShowErrorToast(false)}
//               >
//                 ×
//               </button>
//             </div>
//           )}

//           {validationToast.show && (
//             <div className="toast-notification">
//               <div className="toast-notification__content">
//                 <span className="toast-notification__icon">❌</span>
//                 <p>{validationToast.message}</p>
//               </div>
//             </div>
//           )}

//           {paymentStatus === 'rejected' ? (
//             <div className="payment-status-screen">
//               <div className="payment-status-icon rejected-icon"><span>✕</span></div>
//               <h2>Pagamento Recusado</h2>
//               <p>Verifique os dados do cartão ou tente novamente.</p>
//               <div className="payment-status-actions">
//                 <button
//                   type="button"
//                   className="payment-status-btn retry"
//                   onClick={() => {
//                     setPaymentStatus(null);
//                     setShowErrorToast(false);
//                     setErrorMessage('');
//                   }}
//                 >
//                   Tentar Novamente
//                 </button>
//                 <button
//                   type="button"
//                   className="payment-status-btn cancel"
//                   onClick={handleClose}
//                 >
//                   Cancelar
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <form onSubmit={handleSubmit}>
//               <div className="payment-modal-body">
//                 <div className="payment-plan-summary">
//                   <h3>{selectedPlan.name}</h3>
//                   <p className="payment-plan-price">
//                     R$ {Number(selectedPlan.price).toFixed(2).replace('.', ',')}
//                   </p>
//                 </div>

//                 <div className="payment-methods">
//                   <button
//                     type="button"
//                     className="payment-method-btn active"
//                   >
//                     Cartão
//                   </button>
//                 </div>

//                 <div style={{ marginTop: 16 }}>
//                   <PaymentElement
//                     options={{
//                       layout: 'tabs',
//                     }}
//                   />
//                 </div>

//                 {!isAppointmentPayment && (
//                   <div className="payment-terms-section">
//                     <div className="payment-terms-box">
//                       <h4>📄 Termos de Contratação</h4>
//                       <p>Leia atentamente nossos termos de contratação antes de prosseguir com o pagamento.</p>
//                       {termsDocUrl && (
//                         <a
//                           href={termsDocUrl}
//                           onClick={handleDownloadTerms}
//                           className="payment-terms-download"
//                         >
//                           📥 Baixar Termos
//                         </a>
//                       )}
//                     </div>

//                     <label className="payment-terms-checkbox">
//                       <input
//                         type="checkbox"
//                         checked={acceptedTerms}
//                         onChange={(e) => setAcceptedTerms(e.target.checked)}
//                       />
//                       <span>Li e aceito os termos de contratação</span>
//                     </label>
//                   </div>
//                 )}

//                 <div className="payment-modal-footer">
//                   <button type="button" onClick={handleClose}>
//                     Cancelar
//                   </button>
//                   <button type="submit" disabled={!stripe || !elements || processing}>
//                     {processing ? 'Processando...' : 'Pagar'}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           )}
//         </div>
//       </div>

//       {processing && (
//         <div className="processing-overlay">
//           <div className="processing-content">
//             <div className="processing-spinner-large"></div>
//             <h2>Processando Pagamento</h2>
//             <p>Aguarde enquanto confirmamos sua transação</p>
//             <div className="processing-dots">
//               <span></span><span></span><span></span>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// export default function PaymentModal(props) {
//   const {
//     isOpen,
//     selectedPlan,
//     currentUser,
//     isAppointmentPayment = false,
//   } = props;

//   const [clientSecret, setClientSecret] = useState('');
//   const [loadingIntent, setLoadingIntent] = useState(false);
//   const [intentError, setIntentError] = useState('');

//   const isRecurringSubscription = !isAppointmentPayment && selectedPlan?.isRecurring;

//   useEffect(() => {
//     let cancelled = false;

//     const createIntent = async () => {
//       if (!isOpen || !selectedPlan || !currentUser || isRecurringSubscription) return;

//       setLoadingIntent(true);
//       setIntentError('');
//       setClientSecret('');

//       try {
//         const response = await createStripePaymentIntent({
//           amount: Number(selectedPlan.price),
//           currency: 'brl',
//           customerEmail: currentUser.email,
//           metadata: {
//             userId: String(currentUser.id || ''),
//             planId: String(selectedPlan.id || ''),
//             planName: String(selectedPlan.name || ''),
//             isAppointmentPayment: String(Boolean(isAppointmentPayment)),
//           },
//         });

//         if (!cancelled) {
//           setClientSecret(response.clientSecret);
//         }
//       } catch (error) {
//         console.error('Erro ao criar PaymentIntent:', error);
//         if (!cancelled) {
//           setIntentError(error.message || 'Erro ao iniciar pagamento.');
//         }
//       } finally {
//         if (!cancelled) {
//           setLoadingIntent(false);
//         }
//       }
//     };

//     createIntent();

//     return () => {
//       cancelled = true;
//     };
//   }, [
//     isOpen,
//     selectedPlan?.id,
//     selectedPlan?.price,
//     selectedPlan?.name,
//     currentUser?.id,
//     currentUser?.email,
//     isAppointmentPayment,
//     isRecurringSubscription,
//   ]);

//   const elementsOptions = useMemo(() => {
//     if (!clientSecret) return null;

//     return {
//       clientSecret,
//       locale: 'pt-BR',
//       appearance: {
//         theme: 'night',
//         variables: {
//           colorPrimary: '#ff7a1a',
//           colorBackground: '#1a1a1a',
//           colorText: '#ffffff',
//           colorDanger: '#df1b41',
//           borderRadius: '12px',
//         },
//       },
//     };
//   }, [clientSecret]);

//   if (!isOpen) return null;

//   if (isRecurringSubscription) {
//     return (
//       <div className="payment-modal-overlay" onClick={props.onClose}>
//         <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
//           <button className="payment-modal-close" onClick={props.onClose}>×</button>

//           <div className="payment-modal-header">
//             <h2>Assinatura recorrente</h2>
//             <p className="payment-modal-subtitle">
//               O fluxo recorrente da Stripe precisa ser migrado para Billing/Subscriptions.
//             </p>
//           </div>

//           <div className="payment-modal-body">
//             <div className="payment-plan-summary">
//               <h3>{selectedPlan?.name}</h3>
//               <p className="payment-plan-price">
//                 R$ {Number(selectedPlan?.price || 0).toFixed(2).replace('.', ',')}
//                 <span className="recurring-badge"> /mês</span>
//               </p>
//             </div>

//             <p style={{ marginTop: 16 }}>
//               Neste primeiro passo eu migrei o checkout avulso/cartão para Stripe sem redirecionamento.
//               A assinatura recorrente deve virar uma Subscription da Stripe.
//             </p>

//             <div className="payment-modal-footer">
//               <button type="button" onClick={props.onClose}>Fechar</button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (loadingIntent) {
//     return (
//       <div className="payment-modal-overlay" onClick={props.onClose}>
//         <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
//           <button className="payment-modal-close" onClick={props.onClose}>×</button>
//           <div className="payment-modal-body">
//             <p>Preparando pagamento...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (intentError) {
//     return (
//       <div className="payment-modal-overlay" onClick={props.onClose}>
//         <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
//           <button className="payment-modal-close" onClick={props.onClose}>×</button>
//           <div className="payment-modal-body">
//             <p>{intentError}</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!elementsOptions) return null;

//   return (
//     <Elements stripe={stripePromise} options={elementsOptions}>
//       <StripePaymentForm {...props} clientSecret={clientSecret} />
//     </Elements>
//   );
// }

/// *** STRIPE PAYMENT MODAL - VERSÃO INICIAL COM ELEMENTS E PAYMENT INTENT - AINDA EM DESENVOLVIMENTO *** ///


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
import { getToken } from '../../services/authService';
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
  const token = getToken();

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
      console.log('🔄 Desfazendo agendamento:', appointmentId);
      await deleteAppointment(appointmentId);
      console.log('✅ Agendamento removido com sucesso');
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
    const finalAmount = getFinalPrice();
    const paymentMethod = normalizePaymentMethod();

    if (isAppointmentPayment) {
      // ✅ NOVO: Agendamento já foi criado no AppointmentsPage.jsx
      // Apenas registrar a relação do pagamento com o agendamento existente
      if (selectedPlan?.appointmentId) {
        // Agendamento já foi criado ANTES do pagamento
        await criarPagamentoAgendamento({
          ...selectedPlan.paymentData,
          appointmentId: selectedPlan.appointmentId,  // ✅ ID já existe
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
        const appointmentResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/appointments`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(selectedPlan.appointmentData),
          }
        );

        if (!appointmentResponse.ok) {
          throw new Error('Erro ao criar agendamento');
        }

        const createdAppointment = await appointmentResponse.json();

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
                  <button
                    type="button"
                    className={`payment-method-btn ${selectedStripeMethod === 'card' ? 'active' : ''}`}
                  >
                    Cartão
                  </button>
                  {stripePixEnabled ? (
                    <button
                      type="button"
                      className={`payment-method-btn ${selectedStripeMethod === 'pix' ? 'active' : ''}`}
                    >
                      Pix
                    </button>
                  ) : (
                    <span className="payment-method-hint">Pix indisponível nesta conta Stripe</span>
                  )}
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
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <img
                      src={`data:image/png;base64,${pixQrCodeBase64}`}
                      alt="QR Code Pix"
                      style={{ width: 220, maxWidth: '100%', borderRadius: 12 }}
                    />
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={pixQrCode}
                    readOnly
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button type="button" onClick={handleCopyPixKey}>
                    {pixQrCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <p style={{ marginTop: 12, fontSize: '0.9rem', color: '#b0b0b0' }}>
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
    <Elements stripe={stripePromise} options={elementsOptions}>
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