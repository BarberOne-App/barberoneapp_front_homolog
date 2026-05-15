// src/services/efiService.js

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createEfiCardPayment(payload) {
  const response = await fetch(`${API_BASE_URL}/efi/card-payment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      data?.error_description ||
      'Erro ao processar pagamento via Efí.'
    );
  }

  return data;
}