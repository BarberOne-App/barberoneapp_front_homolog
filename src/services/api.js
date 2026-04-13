import axios from "axios";

const api = axios.create({
  baseURL: "https://barberoneapp-back-homolog.onrender.com" || "http://localhost:3000",
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

export default api;