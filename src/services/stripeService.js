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

  return data;
}

export async function createStripeSubscriptionIntent(payload) {
  const token = getToken();

  const { data } = await axios.post(
    `${API_URL}/subscriptions`,
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