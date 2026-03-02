
import axios from "axios";

function makeIdempotencyKey() {
  return `mp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const processMercadoPagoPayment = async (paymentData) => {
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/process_payment`,
      paymentData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": makeIdempotencyKey(),
          "Authorization": `Bearer ${import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );
    return res.data;
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Erro ao processar pagamento";
    throw new Error(msg);
  }
};

export const processMercadoPagoPaymentPix = async (paymentData) => {
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/criar_pix`,
      paymentData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": makeIdempotencyKey(),
          // "Authorization": `Bearer ${import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );
    return res.data;
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Erro ao processar pagamento PIX";
    throw new Error(msg);
  }
};


export const checkPixStatus = async (pixId) => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/pixstatus/${pixId}`,
      // {
      //   headers: {
      //     "Authorization": `Bearer ${import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN}`,
      //   },
      // }
    );
    console.log(res.data)
    return res.data; 
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Erro ao verificar status do PIX";
    throw new Error(msg);
  }
};
