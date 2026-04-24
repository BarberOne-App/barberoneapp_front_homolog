import api from "./api.js";
import { getToken } from "./authService.js";

const BASE = "https://barberoneapp-back-homolog.onrender.com/users";
const token = getToken();

export async function getUsers(params = {}) {
  const res = await api.get(BASE, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function createUser(data) {
  const res = await api.post(BASE, data, {
     headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function importUsers(data) {
  return api.post(`${BASE}/import`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function userExists(email) {
  try {
    const res = await api.get(`${BASE}/check-email/${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data?.exists ?? false;
  } catch {
    return false;
  }
}

export async function updateUser(userId, data) {
  const res = await api.patch(`${BASE}/${userId}`, data, {
     headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function getUserById(userId) {
  const res = await api.get(`${BASE}/${userId}`, {
     headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}
