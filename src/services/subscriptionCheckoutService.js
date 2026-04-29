import { createStripeSubscriptionCheckoutSession } from './stripeService.js';
import { criarAssinatura } from './paymentService.js';
import { isLocalOrHomologEnvironment } from './subscriptionEnvironment.js';

export const getSubscriptionPaymentLink = (plan) =>
  plan?.stripePaymentLinkUrl ||
  plan?.stripePaymentLink ||
  plan?.stripe_payment_link_url ||
  plan?.mpSubscriptionUrl ||
  plan?.subscriptionUrl ||
  '';

export const createLocalTestSubscription = async (plan, currentUser) => {
  const planPrice = Number(plan?.price || 0);
  const subscriptionPayload = {
    userId: currentUser.id,
    userName: currentUser.name || currentUser.displayName || currentUser.email,
    planId: plan.id,
    planName: plan.name,
    planPrice,
    amount: planPrice,
    isRecurring: true,
    autoRenewal: true,
    paymentMethod: 'teste_local',
  };

  try {
    return await criarAssinatura(subscriptionPayload);
  } catch (error) {
    console.warn('API de assinatura de teste indisponível. Simulando assinatura local.', error);
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    return {
      id: `local-test-${currentUser.id}-${plan.id}-${now.getTime()}`,
      ...subscriptionPayload,
      status: 'active',
      startDate: now.toISOString(),
      nextBillingDate: nextBillingDate.toISOString(),
      lastBillingDate: now.toISOString(),
      planDetails: plan,
      localOnly: true,
    };
  }
};

export const startSubscriptionFlow = async (plan, currentUser) => {
  const planWithRecurring = {
    ...plan,
    isRecurring: true,
    autoRenewal: true,
  };

  localStorage.setItem('selectedPlan', JSON.stringify(planWithRecurring));
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  const subscriptionUrl = getSubscriptionPaymentLink(plan);

  if (subscriptionUrl) {
    window.location.href = subscriptionUrl;
    return { type: 'redirect' };
  }

  if (plan?.stripePriceId) {
    const session = await createStripeSubscriptionCheckoutSession({
      planId: plan.id,
      email: currentUser.email,
    });

    if (!session?.url) {
      throw new Error('Não foi possível iniciar o checkout.');
    }

    window.location.href = session.url;
    return { type: 'redirect' };
  }

  if (!isLocalOrHomologEnvironment()) {
    throw new Error('Link de assinatura não configurado para esse plano.');
  }

  const subscription = await createLocalTestSubscription(plan, currentUser);
  localStorage.setItem('localTestSubscription', JSON.stringify(subscription));

  return { type: 'local-test', subscription };
};
