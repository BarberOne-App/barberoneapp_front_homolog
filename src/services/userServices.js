import api from "./api.js";

const BASE = "/users";

export async function getUsers() {
  const res = await api.get(BASE);
  return res.data;
}

export async function createUser(data) {
  const res = await api.post(BASE, data);
  return res.data;
}

export async function authUser(email, password) {
  const res = await api.get(`${BASE}?email=${email}&password=${password}`);
  return res.data.length > 0 ? res.data[0] : null;
}

export async function userExists(email) {
  const res = await api.get(`${BASE}?email=${email}`);
  return res.data.length > 0;
}

export async function updateUser(userId, data) {
  const res = await api.patch(`${BASE}/${userId}`, data);
  return res.data;
}

export async function getUserById(userId) {
  const res = await api.get(`${BASE}/${userId}`);
  return res.data;
}