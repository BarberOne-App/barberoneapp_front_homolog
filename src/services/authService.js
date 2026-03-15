import api from "./api";

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
  try {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("activeBarbershop");
}

export const getRedirectPath = () => {
  const user = getSession();
  if (!user) return '/login';
  if (user.role === 'admin' || user.isAdmin) return '/admin';
  if (user.role === 'barber') return '/barber';
  return '/appointments';
};