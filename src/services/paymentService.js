import api from './api';
import { getToken } from './authService';

const token = getToken();

function obterProximaDataCobranca() {
  const hoje = new Date();
  const proximoMes = new Date(hoje.setMonth(hoje.getMonth() + 1));
  return proximoMes.toISOString();
}

function calcularDiasAtraso(nextBillingDate) {
  const hoje = new Date();
  const dataCobranca = new Date(nextBillingDate);
  const diferencaMs = hoje - dataCobranca;
  const dias = Math.floor(diferencaMs / (1000 * 60 * 60 * 24));
  return dias > 0 ? dias : 0;
}

function gerarIdTransacao() {
  const timestamp = Date.now();
  const aleatorio = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `TRX-${timestamp}-${aleatorio}`;
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

export const buscarPlanosAssinatura = async () => {
  try {
    const response = await api.get('/subscription-plans', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {

    throw new Error('Não foi possível carregar os planos de assinatura');
  }
};

export const buscarPlanoAssinatura = async (planId) => {
  try {
    const response = await api.get(`/subscription-plans/${planId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {

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
      amount: dadosAssinatura.amount || dadosAssinatura.planPrice,
      status: 'active',
      startDate: new Date().toISOString(),
      nextBillingDate: obterProximaDataCobranca(),
      lastBillingDate: new Date().toISOString(),
      paymentMethod: dadosAssinatura.paymentMethod,

      isRecurring: dadosAssinatura.isRecurring ?? true,
      autoRenewal: dadosAssinatura.autoRenewal ?? true,
      daysOverdue: 0,

      monthlyBarberId: null,
      monthlyBarberName: null,
      monthlyBarberSetDate: null,
      overdueNotificationSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };


    const response = await api.post('/subscriptions', assinatura, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    throw new Error('Não foi possível criar a assinatura');
  }
};

export const verificarAssinaturasVencidas = async () => {
  try {
    const response = await api.get('/subscriptions?status=active', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const assinaturasAtivas = response.data;
    const hoje = new Date();

    const assinaturasVencidas = assinaturasAtivas.filter(sub => {
      const nextBilling = new Date(sub.nextBillingDate);
      return hoje > nextBilling;
    });


    return assinaturasVencidas;
  } catch (error) {

    return [];
  }
};

export const marcarAssinaturaComoAtrasada = async (subscriptionId) => {
  try {
    const subscription = await api.get(`/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const sub = subscription.data;

    const diasAtraso = calcularDiasAtraso(sub.nextBillingDate);



    const response = await api.patch(`/subscriptions/${subscriptionId}`, {
      status: 'overdue',
      daysOverdue: diasAtraso,
      updatedAt: new Date().toISOString()
    });

    return response.data;
  } catch (error) {

    throw error;
  }
};

export const enviarNotificacaoAtraso = async (subscription) => {
  try {
    const dataVencimento = new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR');

    const mensagem = `🚨 *Pagamento Atrasado* 🚨\n\nOlá *${subscription.userName}*!\n\nSua assinatura do plano *${subscription.planName}* está com o pagamento atrasado.\n\n💰 *Valor:* R$ ${subscription.amount.toFixed(2).replace('.', ',')}\n📅 *Vencimento:* ${dataVencimento}\n⏰ *Dias de atraso:* ${subscription.daysOverdue}\n\nPor favor, realize o pagamento para continuar aproveitando os benefícios do seu plano.\n\n👉 Acesse o sistema para pagar: https://seusite.com/pagamentos\n\n_Mensagem automática - Barbearia AdDev_`;


    let telefone = '5585999999999';

    try {
      const userResponse = await api.get(`/users/${subscription.userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const user = userResponse.data;
      if (user.phone) {

        telefone = user.phone.replace(/\D/g, '');
        if (!telefone.startsWith('55')) {
          telefone = '55' + telefone;
        }
      }
    } catch (error) {
      console.warn('Não foi possível buscar telefone do usuário:', error);
    }

    const urlWhatsApp = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;


    await api.patch(`/subscriptions/${subscription.id}`, {
      overdueNotificationSent: true,
      lastNotificationDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

    if (typeof window !== 'undefined') {
      window.open(urlWhatsApp, '_blank');
    }

    return {
      success: true,
      url: urlWhatsApp,
      telefone: telefone,
      mensagem: mensagem
    };
  } catch (error) {
    throw error;
  }
};

export const renovarAssinatura = async (subscriptionId, paymentData) => {
  try {
    const hoje = new Date();
    const proximaCobranca = obterProximaDataCobranca();



    const response = await api.patch(`/subscriptions/${subscriptionId}`,
      {
        status: 'active',
        lastBillingDate: hoje.toISOString(),
        nextBillingDate: proximaCobranca,
        daysOverdue: 0,
        overdueNotificationSent: false,
        paymentMethod: paymentData.paymentMethod,
        updatedAt: hoje.toISOString()
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


    await api.post(
      '/payments',
      {
        userId: response.data.userId,
        userName: response.data.userName,
        subscriptionId: subscriptionId,
        planId: response.data.planId,
        planName: response.data.planName,
        amount: response.data.amount,
        paymentMethod: paymentData.paymentMethod,
        status: 'approved',
        type: 'subscription_renewal',
        transactionId: gerarIdTransacao(),
        createdAt: hoje.toISOString(),
        approvedAt: hoje.toISOString()
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );


    return response.data;
  } catch (error) {

    throw error;
  }
};

export const alternarModoCobranca = async (subscriptionId, isRecurring) => {
  try {
    const response = await api.patch(`/subscriptions/${subscriptionId}`, {
      isRecurring: isRecurring,
      autoRenewal: isRecurring,
      updatedAt: new Date().toISOString()
    },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {

    throw error;
  }
};

export const buscarAssinaturasUsuario = async (userId) => {
  try {
    const response = await api.get(`/subscriptions?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {

    throw new Error('Não foi possível carregar suas assinaturas');
  }
};

export const buscarAssinaturaAtiva = async (userId) => {
  try {

    const [resActive, resPending] = await Promise.all([
      api.get(`/subscriptions?userId=${userId}&status=active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      api.get(`/subscriptions?userId=${userId}&status=cancel_pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    const todas = [...resActive.data, ...resPending.data];
    const hoje = new Date();


    const valida = todas.find(s => {
      if (!s.nextBillingDate) return false;
      return new Date(s.nextBillingDate) > hoje;
    });

    return valida || null;
  } catch (error) {
    console.error('Erro ao buscar assinatura ativa:', error);
    return null;
  }
};

export const buscarTodasAssinaturas = async () => {
  try {
    const response = await api.get('/subscriptions?_sort=createdAt&_order=desc', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {

    return [];
  }
};

export const atualizarStatusAssinatura = async (subscriptionId, status) => {
  try {
    const response = await api.patch(`/subscriptions/${subscriptionId}`, {
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'cancelled' && { cancelledAt: new Date().toISOString() })
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
      products: dadosPagamento.products || [],
      status: dadosPagamento.status || 'pending',
      paymentMethod: dadosPagamento.paymentMethod || null,
      ...(dadosPagamento.status === 'paid' && {
        paidAt: dadosPagamento.paidAt || new Date().toISOString()
      }),
      type: 'appointment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };


    const response = await api.post('/appointmentPayments', pagamento, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw new Error('Não foi possível criar o pagamento');
  }
};

export const buscarPagamentoAgendamento = async (appointmentId) => {
  try {
    const response = await api.get(`/appointmentPayments?appointmentId=${appointmentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    return null;
  }
};

export const buscarTodosPagamentosAgendamentos = async () => {
  try {
    const response = await api.get('/appointmentPayments?_sort=createdAt&_order=desc', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("RETORNO DE PAGAMENTOS DE AGENDAMENTOS", response.data);
    return response.data.items;
  } catch (error) {

    return [];
  }
};

export const atualizarPagamentoAgendamento = async (paymentId, dados) => {
  try {
    const response = await api.patch(`/appointmentPayments/${paymentId}`, {
      ...dados,
      updatedAt: new Date().toISOString(),
      ...(dados.status === 'paid' && !dados.paidAt && { paidAt: new Date().toISOString() })
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

    const response = await api.post('/payments', pagamento, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    throw error;
  }
};

export const buscarHistoricoPagamentos = async (userId) => {
  try {
    const response = await api.get(`/payments?userId=${userId}&_sort=createdAt&_order=desc`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw new Error('Não foi possível carregar o histórico de pagamentos');
  }
};

export const buscarPagamento = async (paymentId) => {
  try {
    const response = await api.get(`/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
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

    const response = await api.post('/payment-methods', metodoPagamento, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao salvar método:', error);
    throw new Error('Não foi possível salvar o método de pagamento');
  }
};

export const buscarMetodosPagamento = async (userId) => {
  try {
    const response = await api.get(`/payment-methods?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar métodos:', error);
    throw new Error('Não foi possível carregar os métodos de pagamento');
  }
};

export const deletarMetodoPagamento = async (methodId) => {
  try {
    await api.delete(`/payment-methods/${methodId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
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
        api.patch(`/payment-methods/${metodo.id}`, { isDefault: false }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      )
    );

    const response = await api.patch(`/payment-methods/${methodId}`, { isDefault: true }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {

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

function gerarCodigoPix() {
  const timestamp = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).substring(2, 32);
  return `00020126580014br.gov.bcb.pix0136${aleatorio}${timestamp}5204000053039865802BR5925BARBEARIA ADDEV LTDA6009FORTALEZA62070503***6304`;
}

function gerarQrCodePix() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
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

export const enviarNotificacaoAssinatura = async (subscription) => {
  try {
    const dataVencimento = new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR');

    const mensagem = ` *Assinatura Ativada com Sucesso!* \n\nOlá *${subscription.userName}*!\n\nSua assinatura do plano *${subscription.planName}* foi ativada com sucesso!\n\n *Status:* Ativo\n *Valor:* R$ ${subscription.amount.toFixed(2).replace('.', ',')}\n *Próxima cobrança:* ${dataVencimento}\n *Forma de pagamento:* ${subscription.paymentMethod.toUpperCase()}\n${subscription.isRecurring ? ' *Renovação automática:* ' + (subscription.autoRenewal ? 'Ativada' : 'Desativada') : ''}\n\nObrigado por escolher nossos serviços!\n\n_Mensagem automática - Barbearia AdDev_`;

    let telefone = '5585982299499';

    try {
      const userResponse = await api.get(`/users/${subscription.userId}`);
      const user = userResponse.data;
      if (user.phone) {
        let userPhone = user.phone.replace(/\D/g, '');
        if (!userPhone.startsWith('55')) {
          userPhone = '55' + userPhone;
        }

        telefone = userPhone;
      }
    } catch (error) {

    }

    const urlWhatsApp = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;



    if (typeof window !== 'undefined') {
      window.open(urlWhatsApp, '_blank');
    }

    return {
      success: true,
      url: urlWhatsApp,
      telefone: telefone,
      mensagem: mensagem
    };
  } catch (error) {

    throw error;
  }
};

export const testarNotificacaoWhatsApp = async () => {
  const subscriptionTeste = {
    id: 'test-001',
    userId: 'ff1a',
    userName: 'LUCAS',
    planName: 'Premium',
    amount: 150.00,
    nextBillingDate: new Date('2026-02-06').toISOString(),
    daysOverdue: 0,
    paymentMethod: 'credito',
    isRecurring: true,
    autoRenewal: true
  };

  try {

    const result = await enviarNotificacaoAssinatura(subscriptionTeste);

    return result;
  } catch (error) {
    throw error;
  }
};

export const criarVendaProduto = async (dados) => {
  try {
    const venda = {
      userId: dados.userId,
      userName: dados.userName,
      products: dados.products,
      productsTotal: dados.productsTotal,
      status: dados.status || 'pending',
      paymentMethod: dados.paymentMethod || null,
      saleDate: new Date().toISOString().split('T')[0],
      ...(dados.status === 'paid' ? { paidAt: new Date().toISOString() } : {}),
      type: 'product_sale',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const response = await api.post('/productSales', venda);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar venda de produto:', error);
    throw new Error('Não foi possível registrar a venda');
  }
};

export const buscarTodasVendasProdutos = async () => {
  try {
    const response = await api.get('/productSales', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar vendas de produtos:', error);
    return [];
  }
};

export const atualizarVendaProduto = async (id, dados) => {
  try {
    const response = await api.patch(`/productSales/${id}`, {
      ...dados,
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    throw new Error('Não foi possível atualizar a venda');
  }
};