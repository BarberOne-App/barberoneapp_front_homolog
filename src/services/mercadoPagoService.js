

export const processMercadoPagoPayment = async (paymentData) => {
  console.log('🔄 MODO TESTE - Simulando pagamento...', paymentData);
  

  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    id: `TEST-${Date.now()}`,
    status: 'approved',
    status_detail: 'accredited',
    transaction_amount: paymentData.transaction_amount,
    installments: paymentData.installments,
    payment_method_id: paymentData.payment_method_id,
    date_created: new Date().toISOString(),
    date_approved: new Date().toISOString(),
    card: {
      last_four_digits: '1234'
    }
  };
};

