import axios from "axios";

export const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

if (!API_BASE_URL) {
  throw new Error("VITE_API_URL não foi definida no arquivo .env");
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Adiciona o token JWT em toda requisição autenticada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("activeBarbershop");
      localStorage.removeItem("sessionApiBaseUrl");
    }

    return Promise.reject(error);
  },
);

export default api;
