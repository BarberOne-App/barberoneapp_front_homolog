import api from "./api.js";

const BASE = "https://barbearia-addev-backend.onrender.com/users";

export async function getUsers() {
  const res = await api.get(BASE);
  console.log('getUsers response:', res);
  return res.data;
}

export async function createUser(data) {
  const res = await api.post(BASE, data);
  return res.data;
}

export async function userExists(email) {
  try {
    const res = await api.get(`${BASE}/check-email/${encodeURIComponent(email)}`);
    return res.data?.exists ?? false;
  } catch {
    return false;
  }
}

export async function updateUser(userId, data) {
  const res = await api.patch(`${BASE}/${userId}`, data);
  return res.data;
}

export async function getUserById(userId) {
  const res = await api.get(`${BASE}/${userId}`);
  return res.data;
}