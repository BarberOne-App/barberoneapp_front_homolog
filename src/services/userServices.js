import api from "./api.js";
import { getToken } from "./authService.js";

const BASE = "/users";
const MAX_LIMIT = 100;

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
  };
}

function normalizeUserParams(params = {}) {
  const normalizedParams = { ...params };

  const limit = Number(normalizedParams.limit);

  if (!normalizedParams.limit || !Number.isFinite(limit) || limit > MAX_LIMIT) {
    normalizedParams.limit = MAX_LIMIT;
  }

  if (!normalizedParams.page) {
    normalizedParams.page = 1;
  }

  return normalizedParams;
}

export async function getUsers(params = {}) {
  const res = await api.get(BASE, {
    params: normalizeUserParams(params),
    headers: getAuthHeaders(),
  });

  return res.data;
}

export async function getAllUsers(params = {}) {
  return getUsers(params);
}

export async function createUser(data) {
  const res = await api.post(BASE, data, {
    headers: getAuthHeaders(),
  });

  return res.data;
}

export async function importUsers(data) {
  const res = await api.post(`${BASE}/import`, data, {
    headers: getAuthHeaders(),
  });

  return res.data;
}

export async function userExists(email) {
  try {
    const res = await api.get(`${BASE}/check-email/${encodeURIComponent(email)}`, {
      headers: getAuthHeaders(),
    });

    return res.data?.exists ?? false;
  } catch {
    return false;
  }
}

export async function updateUser(userId, data) {
  const res = await api.patch(`${BASE}/${userId}`, data, {
    headers: getAuthHeaders(),
  });

  return res.data;
}

export async function getUserById(userId) {
  const res = await api.get(`${BASE}/${userId}`, {
    headers: getAuthHeaders(),
  });

  return res.data;
}