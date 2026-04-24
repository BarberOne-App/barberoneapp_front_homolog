import axios from 'axios';
import { getToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL;

export async function createStripePaymentIntent(payload) {
  const token = getToken();

  const { data } = await axios.post(
    `${API_URL}/payment-intents`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  console.log('paymentIntentId:', data.paymentIntentId);
  console.log('clientSecret:', data.clientSecret);
  console.log(
    'bate?',
    data.clientSecret?.startsWith(data.paymentIntentId + '_secret_')
  );

  return data;
}

export async function createStripeSubscriptionIntent(payload) {
  const token = getToken();

  const { data } = await axios.post(
    `${API_URL}/stripe/subscriptions`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  return data;
}

export async function createStripeSubscriptionCheckoutSession(payload) {
  const token = getToken();

  const { data } = await axios.post(
    `${API_URL}/stripe/subscription-checkout-session`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  return data;
}

export async function createStripeConnectAccount() {
  const token = getToken();

  const { data } = await axios.post(
    `${API_URL}/stripe/connect/account`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  return data;
}

export async function createStripeConnectAccountLink() {
  const token = getToken();

  const { data } = await axios.post(
    `${API_URL}/stripe/connect/account-link`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  return data;
}

export async function getStripeConnectStatus() {
  const token = getToken();

  const { data } = await axios.get(
    `${API_URL}/stripe/connect/status`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  return data;
}