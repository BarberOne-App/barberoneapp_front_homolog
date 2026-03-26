import api from "./api.js";
import { getToken } from "./authService.js";

const BASE = "https://barberone-backend.onrender.com/services";
const token = getToken();

export async function getAllServices() {
  const res = await api.get(BASE, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      includeInactive: true,
    },
  });
  return res.data.items;
}


export async function getServiceById(id) {
  const res = await api.get(`${BASE}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}


export async function createService(serviceData) {
  const res = await api.post(BASE, serviceData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function importServices(data) {
  const res = await api.post(`${BASE}/import`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}


export async function updateService(id, serviceData) {
  const res = await api.patch(`${BASE}/${id}`, serviceData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}


export async function deleteService(id) {
  const res = await api.delete(`${BASE}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}
