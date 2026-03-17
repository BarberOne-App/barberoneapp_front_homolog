import api from "./api.js";
import { getToken } from "./authService.js";

const BASE = "https://barbearia-addev-backend.onrender.com/users";
const token = getToken();

export async function getUsers() {
  const res = await api.get(BASE, {
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