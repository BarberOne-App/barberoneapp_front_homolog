import api from "./api";

const TOKEN_EXPIRY_LEEWAY_SECONDS = 30;

function decodeJwtPayload(token) {
  try {
    const base64Url = String(token || "").split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenValid(token) {
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== "object") return false;

  // Se não tiver exp, considera inválido para evitar sessão fantasma.
  if (!payload.exp) return false;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return Number(payload.exp) > nowInSeconds + TOKEN_EXPIRY_LEEWAY_SECONDS;
}

/**
 * Login via backend real — POST /auth/login
 * O backend exige { slug, email, password } e retorna { token, barbershop, user }
 */
export async function login(email, password) {
  const { data } = await api.post("/auth/login", {
    email,
    password,
  });

  saveSession(data);
  return data.user;
}

/**
 * Login com Google — registra como cliente caso o usuário ainda não exista.
 * Usa a rota de registro de cliente do backend real.
 * Se o usuário já existir, tenta login normal (precisará da senha — fluxo limitado sem suporte OAuth no backend).
 */
export async function loginWithGoogle(name, email, slug) {
  // Tenta registrar como novo cliente (sem senha — fluxo parcial)
  // TODO: implementar rota OAuth no backend para suporte completo ao Google
  try {
    const { data } = await api.post("/auth/register/client-google", {
      slug: slug,
      name: name,
      email: email,
      password: crypto.randomUUID().slice(0, 12), // senha temporária
      phone: null,
    });
    saveSession(data);
    return data.user;
  } catch (error) {
    // Se já existe (409 conflict), tenta carregar dados via /auth/me com token existente
    if (error.response?.status === 409) {
      throw new Error("Usuário já cadastrado. Faça login com email e senha.");
    }
    throw error;
  }
}

/**
 * Registro de cliente — POST /auth/register/client
 * O backend exige { slug, name, email, phone?, password }
 */
export async function register(userData) {
  const { data } = await api.post("/auth/register/client", {
    slug: userData.slug,
    name: userData.name,
    email: userData.email,
    cpf: userData.cpf || null,
    phone: userData.phone || null,
    password: userData.password,
  });

  saveSession(data);
  return data.user;
}

/**
 * Busca dados do usuário logado — GET /auth/me
 */
export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

/**
 * Salva tokens + dados do usuário na sessão local.
 */
export function saveSession(data) {
  if (data.token) localStorage.setItem("token", data.token);
  if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

  const user = data.user || data;
  localStorage.setItem("currentUser", JSON.stringify(user));

  if (data.barbershop) {
    localStorage.setItem("activeBarbershop", JSON.stringify(data.barbershop));
  }
}

export function getSession() {
  const token = localStorage.getItem("token");
  if (!isTokenValid(token)) {
    logout();
    return null;
  }

  try {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  const token = localStorage.getItem("token");
  if (!isTokenValid(token)) {
    logout();
    return null;
  }
  return token;
}

export function hasValidSession() {
  return !!getToken() && !!getSession();
}

export function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("activeBarbershop");
}

export const getRedirectPath = () => {
  if (!hasValidSession()) return '/login';

  const user = getSession();
  if (!user) return '/login';
  if (user.role === 'admin' || user.isAdmin) return '/admin';
  if (user.role === 'barber') return '/barber';
  return '/appointments';
};