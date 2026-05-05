import api, { API_BASE_URL } from "./api";

const TOKEN_EXPIRY_LEEWAY_SECONDS = 30;
const SESSION_API_BASE_URL_KEY = "sessionApiBaseUrl";

function shouldCheckHomeInfo(user) {
  const role = String(user?.role || '').toLowerCase();
  return role !== 'super_admin';
}

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

  // Bloqueia login caso a barbearia vinculada esteja inativa ou bloqueada
  const barbershop = data.barbershop || data.user?.barbershop || (Array.isArray(data.user?.barbershops) ? data.user.barbershops[0] : null);
  const status = String(barbershop?.status || '').toLowerCase();
  if (status === 'inactive' || status === 'blocked') {
    const label = status === 'blocked' ? 'bloqueada' : 'inativa';
    // Lança erro no formato esperado pelos handlers do app (error.response.data.message)
    throw { response: { data: { message: `Login bloqueado: a barbearia está ${label}. Entre em contato com o suporte.` } } };
  }

  saveSession(data);

  // Verifica acesso às rotas protegidas (ex: home-info). Se for negado, remove sessão e trata como falha de login.
  if (shouldCheckHomeInfo(data.user)) {
    try {
      await api.get('/home-info');
    } catch (err) {
      // Limpa sessão e repassa mensagem legível para o handler do login
      logout();
      const message = err?.response?.data?.message || (Array.isArray(err?.response?.data) ? err.response.data.join(', ') : null) || 'Acesso indisponível para esta barbearia';
      throw { response: { data: { message } } };
    }
  }

  return data.user;
}

export async function loginWithGoogle(payload) {
  const { accessToken, slug, profileData } = payload || {};
  const { data } = await api.post("/auth/google", {
    accessToken,
    slug: slug || import.meta.env.VITE_BARBERSHOP_SLUG || undefined,
    profileData,
  });

  const barbershop = data.currentBarbershop || data.barbershop || data.user?.barbershop || (Array.isArray(data.user?.barbershops) ? data.user.barbershops[0] : null);
  const status = String(barbershop?.status || '').toLowerCase();
  if (status === 'inactive' || status === 'blocked') {
    const label = status === 'blocked' ? 'bloqueada' : 'inativa';
    throw { response: { data: { message: `Login bloqueado: a barbearia está ${label}. Entre em contato com o suporte.` } } };
  }

  saveSession(data);

  if (!data.requiresProfileCompletion && barbershop && shouldCheckHomeInfo(data.user)) {
    try {
      await api.get('/home-info');
    } catch (err) {
      logout();
      const message = err?.response?.data?.message || (Array.isArray(err?.response?.data) ? err.response.data.join(', ') : null) || 'Acesso indisponível para esta barbearia';
      throw { response: { data: { message } } };
    }
  }

  return data;
}

/**
 * Registro de cliente — POST /auth/register/client
 * O backend exige { slug, name, email, phone?, password }
 */
export async function register(userData, options = {}) {
  const { persistSession = true } = options;
  const { data } = await api.post("/auth/register/client", {
    slug: userData.slug,
    name: userData.name,
    email: userData.email,
    cpf: userData.cpf || null,
    phone: userData.phone || null,
    password: userData.password,
    role: userData.role || "client",
  });

  if (persistSession) {
    saveSession(data);
  }

  return data.user;
}

export async function registerBarbershopFromLanding(payload) {
  const { data } = await api.post('/barbershops/register', payload);
  saveSession(data);
  return data;
}

export async function registerSuperAdminSetup(payload) {
  const { data } = await api.post('/auth/setup/super-admin', {
    setupKey: payload.setupKey,
    name: payload.name,
    email: payload.email,
    password: payload.password,
  });

  saveSession(data);
  return data.user;
}

export async function switchBarbershop(barbershopId) {
  const { data } = await api.post('/auth/switch-barbershop', {
    barbershopId,
  });

  saveSession(data);
  return data;
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
  localStorage.setItem(SESSION_API_BASE_URL_KEY, API_BASE_URL);

  const user = data.user || data;
  localStorage.setItem("currentUser", JSON.stringify(user));

  if (data.barbershop) {
    localStorage.setItem("activeBarbershop", JSON.stringify(data.barbershop));
  }
}

function isSessionForCurrentBarbershop() {
  // Não invalidar automaticamente a sessão apenas porque `VITE_BARBERSHOP_SLUG`
  // está definido no ambiente. Esse valor serve apenas para pré-seleção
  // em deploys específicos, não para bloquear logins de outros tenants.
  return true;
}

export function getSession() {
  const token = localStorage.getItem("token");
  if (!isSessionForCurrentApi() || !isSessionForCurrentBarbershop() || !isTokenValid(token)) {
    logout();
    return null;
  }

  try {
    const userJson = localStorage.getItem("currentUser");
    const user = userJson ? JSON.parse(userJson) : null;

    // Se houver uma barbearia ativa salva, bloqueia sessão local caso ela esteja inativa/bloqueada
    const activeBarbershopJson = localStorage.getItem('activeBarbershop');
    const activeBarbershop = activeBarbershopJson ? JSON.parse(activeBarbershopJson) : null;
    const status = String(activeBarbershop?.status || '').toLowerCase();
    if (status === 'inactive' || status === 'blocked') {
      const label = status === 'blocked' ? 'bloqueada' : 'inativa';
      logout();
      try {
        localStorage.setItem('loginBlockReason', `A barbearia vinculada está ${label}. Entre em contato com o suporte.`);
      } catch (e) {}
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function getToken() {
  const token = localStorage.getItem("token");
  if (!isSessionForCurrentApi() || !isSessionForCurrentBarbershop() || !isTokenValid(token)) {
    logout();
    return null;
  }
  return token;
}

function isSessionForCurrentApi() {
  const sessionApiBaseUrl = localStorage.getItem(SESSION_API_BASE_URL_KEY);
  return !sessionApiBaseUrl || sessionApiBaseUrl === API_BASE_URL;
}

export function hasValidSession() {
  return !!getToken() && !!getSession();
}

export function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("activeBarbershop");
  localStorage.removeItem(SESSION_API_BASE_URL_KEY);
}

export const getRedirectPath = () => {
  if (!hasValidSession()) return '/login';

  const user = getSession();
  if (!user) return '/login';
  if (user.role === 'super_admin') return '/super-admin';
  if (user.role === 'admin' || user.isAdmin) return '/admin';
  if (user.role === 'barber') return '/barber';
  return '/appointments';
};
