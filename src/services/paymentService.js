
import api from './api';


export const buscarPlanosAssinatura = async () => {
  try {
    const response = await api.get('/subscriptionPlans');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    throw new Error('Não foi possível carregar os planos de assinatura');
  }
};


export const buscarPlanoAssinatura = async (planId) => {
  try {
    const response = await api.get(`/subscriptionPlans/${planId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    throw new Error('Plano não encontrado');
  }
};


export const criarAssinatura = async (dadosAssinatura) => {
  try {
    const assinatura = {
      userId: dadosAssinatura.userId,
      userName: dadosAssinatura.userName,
      planId: dadosAssinatura.planId,
      planName: dadosAssinatura.planName,
      planPrice: dadosAssinatura.planPrice,
      amount: dadosAssinatura.planPrice,
      status: 'active',
      startDate: new Date().toISOString(),
      nextBillingDate: obterProximaDataCobranca(),
      paymentMethod: dadosAssinatura.paymentMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await api.post('/subscriptions', assinatura);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    throw new Error('Não foi possível criar a assinatura');
  }
};


export const buscarAssinaturasUsuario = async (userId) => {
  try {
    const response = await api.get(`/subscriptions?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    throw new Error('Não foi possível carregar suas assinaturas');
  }
};


export const buscarAssinaturaAtiva = async (userId) => {
  try {
    const response = await api.get(`/subscriptions?userId=${userId}&status=active`);
    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error('Erro ao buscar assinatura ativa:', error);
    return null;
  }
};


export const buscarTodasAssinaturas = async () => {
  try {
    const response = await api.get('/subscriptions?_sort=createdAt&_order=desc');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar todas assinaturas:', error);
    return [];
  }
};


export const atualizarStatusAssinatura = async (subscriptionId, status) => {
  try {
    const response = await api.patch(`/subscriptions/${subscriptionId}`, {
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'cancelled' && { cancelledAt: new Date().toISOString() })
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    throw new Error('Não foi possível atualizar a assinatura');
  }
};


export const cancelarAssinatura = async (subscriptionId) => {
  return atualizarStatusAssinatura(subscriptionId, 'cancelled');
};


export const criarPagamentoAgendamento = async (dadosPagamento) => {
  try {
    const pagamento = {
      appointmentId: dadosPagamento.appointmentId,
      userId: dadosPagamento.userId,
      userName: dadosPagamento.userName,
      amount: dadosPagamento.amount,
      serviceName: dadosPagamento.serviceName,
      barberName: dadosPagamento.barberName,
      appointmentDate: dadosPagamento.appointmentDate,
      appointmentTime: dadosPagamento.appointmentTime,
      paymentMethod: dadosPagamento.paymentMethod || 'pending',
      status: 'pending', 
      type: 'appointment', 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await api.post('/appointmentPayments', pagamento);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw new Error('Não foi possível criar o pagamento');
  }
};


export const buscarPagamentoAgendamento = async (appointmentId) => {
  try {
    const response = await api.get(`/appointmentPayments?appointmentId=${appointmentId}`);
    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    return null;
  }
};


export const buscarTodosPagamentosAgendamentos = async () => {
  try {
    const response = await api.get('/appointmentPayments?_sort=createdAt&_order=desc');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return [];
  }
};


export const atualizarPagamentoAgendamento = async (paymentId, dados) => {
  try {
    const response = await api.patch(`/appointmentPayments/${paymentId}`, {
      ...dados,
      updatedAt: new Date().toISOString(),
      ...(dados.status === 'paid' && !dados.paidAt && { paidAt: new Date().toISOString() })
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    throw new Error('Não foi possível atualizar o pagamento');
  }
};




export const processarPagamento = async (dadosPagamento) => {
  try {

    await new Promise(resolve => setTimeout(resolve, 2000));

   
    if (dadosPagamento.paymentMethod !== 'pix') {
      const valido = validarDadosCartao(dadosPagamento.card);
      if (!valido) {
        throw new Error('Dados do cartão inválidos');
      }
    }


    const pagamento = {
      userId: dadosPagamento.userId,
      userName: dadosPagamento.userName,
      subscriptionId: dadosPagamento.subscriptionId || null,
      appointmentId: dadosPagamento.appointmentId || null,
      planId: dadosPagamento.planId,
      planName: dadosPagamento.planName,
      amount: dadosPagamento.amount,
      paymentMethod: dadosPagamento.paymentMethod,
      status: 'approved',
      type: dadosPagamento.type || 'subscription', 
      transactionId: gerarIdTransacao(),
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };


    if (dadosPagamento.paymentMethod !== 'pix') {
      pagamento.cardData = {
        brand: detectarBandeiraCartao(dadosPagamento.card.number),
        lastDigits: dadosPagamento.card.number.replace(/\s/g, '').slice(-4),
        holderName: dadosPagamento.card.holderName
      };
      
      if (dadosPagamento.paymentMethod === 'credit') {
        pagamento.installments = dadosPagamento.installments || 1;
        pagamento.installmentAmount = (dadosPagamento.amount / pagamento.installments).toFixed(2);
      }
    } else {
      pagamento.pixCode = gerarCodigoPix();
      pagamento.pixQrCode = gerarQrCodePix();
      pagamento.pixExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }

    const response = await api.post('/payments', pagamento);
    return response.data;
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    throw error;
  }
};


export const buscarHistoricoPagamentos = async (userId) => {
  try {
    const response = await api.get(`/payments?userId=${userId}&_sort=createdAt&_order=desc`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw new Error('Não foi possível carregar o histórico de pagamentos');
  }
};


export const buscarPagamento = async (paymentId) => {
  try {
    const response = await api.get(`/payments/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    throw new Error('Pagamento não encontrado');
  }
};


export const salvarMetodoPagamento = async (dadosMetodo) => {
  try {
    const metodoPagamento = {
      userId: dadosMetodo.userId,
      type: dadosMetodo.type,
      brand: detectarBandeiraCartao(dadosMetodo.cardNumber),
      lastDigits: dadosMetodo.cardNumber.replace(/\s/g, '').slice(-4),
      holderName: dadosMetodo.holderName.toUpperCase(),
      expiryMonth: dadosMetodo.expiry.split('/')[0],
      expiryYear: '20' + dadosMetodo.expiry.split('/')[1],
      isDefault: dadosMetodo.isDefault || false,
      createdAt: new Date().toISOString()
    };

    const response = await api.post('/paymentMethods', metodoPagamento);
    return response.data;
  } catch (error) {
    console.error('Erro ao salvar método:', error);
    throw new Error('Não foi possível salvar o método de pagamento');
  }
};


export const buscarMetodosPagamento = async (userId) => {
  try {
    const response = await api.get(`/paymentMethods?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar métodos:', error);
    throw new Error('Não foi possível carregar os métodos de pagamento');
  }
};


export const deletarMetodoPagamento = async (methodId) => {
  try {
    await api.delete(`/paymentMethods/${methodId}`);
    return true;
  } catch (error) {
    console.error('Erro ao deletar método:', error);
    throw new Error('Não foi possível remover o método de pagamento');
  }
};

export const definirMetodoPadrao = async (userId, methodId) => {
  try {
    const metodos = await buscarMetodosPagamento(userId);
    await Promise.all(
      metodos.map(metodo => 
        api.patch(`/paymentMethods/${metodo.id}`, { isDefault: false })
      )
    );

    const response = await api.patch(`/paymentMethods/${methodId}`, { isDefault: true });
    return response.data;
  } catch (error) {
    console.error('Erro ao definir padrão:', error);
    throw new Error('Não foi possível definir método padrão');
  }
};


function validarDadosCartao(dadosCartao) {
  if (!dadosCartao || !dadosCartao.number || !dadosCartao.holderName || !dadosCartao.expiryDate || !dadosCartao.cvv) {
    return false;
  }

  const numeroCartao = dadosCartao.number.replace(/\s/g, '');
  
  if (numeroCartao.length < 13 || numeroCartao.length > 19) {
    return false;
  }

  if (!/^\d+$/.test(numeroCartao)) {
    return false;
  }

  const [mes, ano] = dadosCartao.expiryDate.split('/');
  const dataExpiracao = new Date(2000 + parseInt(ano), parseInt(mes) - 1);
  const hoje = new Date();
  
  if (dataExpiracao < hoje) {
    return false;
  }

  if (!/^\d{3,4}$/.test(dadosCartao.cvv)) {
    return false;
  }

  return true;
}

function detectarBandeiraCartao(numeroCartao) {
  const numero = numeroCartao.replace(/\s/g, '');
  
  const padroes = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    elo: /^(4011|4312|4389|4514|4573|5041|5066|5067|5090|6277|6362|6363|6504|6505|6516)/,
    hipercard: /^606282/,
    diners: /^(30|36|38)/,
    discover: /^6(?:011|5)/,
  };

  for (const [bandeira, padrao] of Object.entries(padroes)) {
    if (padrao.test(numero)) {
      return bandeira;
    }
  }

  return 'unknown';
}

function gerarIdTransacao() {
  const timestamp = Date.now();
  const aleatorio = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `TRX-${timestamp}-${aleatorio}`;
}

function gerarCodigoPix() {
  const timestamp = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).substring(2, 32);
  return `00020126580014br.gov.bcb.pix0136${aleatorio}${timestamp}5204000053039865802BR5925BARBEARIA ADDEV LTDA6009FORTALEZA62070503***6304`;
}

function gerarQrCodePix() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

function obterProximaDataCobranca() {
  const hoje = new Date();
  const proximoMes = new Date(hoje.setMonth(hoje.getMonth() + 1));
  return proximoMes.toISOString();
}

export function calcularEconomia(precoPlano, cortesPorMes) {
  const precoCorteRegular = 40;
  const custoMensal = precoCorteRegular * cortesPorMes;
  const economia = custoMensal - precoPlano;
  const porcentagemEconomia = custoMensal > 0 ? ((economia / custoMensal) * 100).toFixed(0) : 0;
  
  return { 
    economia: economia > 0 ? economia : 0, 
    porcentagemEconomia: porcentagemEconomia > 0 ? porcentagemEconomia : 0, 
    custoMensal 
  };
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

export function formatarData(stringData) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(stringData));
}